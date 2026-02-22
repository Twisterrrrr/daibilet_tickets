import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ReviewStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { createHash, randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { EmailJobData } from '../queue/email.processor';
import { QUEUE_EMAILS } from '../queue/queue.constants';
import { ProcessedImage, UploadService } from '../upload/upload.service';
import { CreateReviewDto } from './dto/create-review.dto';

export interface VoteDto {
  helpful: boolean;
}

const MAX_PHOTOS_PER_REVIEW = 5;
const MIN_FORM_TIME_MS = 5000; // 5 секунд
const VERIFY_TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 часов

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly upload: UploadService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_EMAILS) private readonly emailQueue: Queue<EmailJobData>,
  ) {
    this.appUrl = this.config.get('APP_URL', 'http://localhost:3000');
  }

  // ========================
  // Создание отзыва
  // ========================

  /**
   * Создать отзыв.
   * Если есть voucherCode/reviewRequestToken — сразу PENDING (модерация).
   * Иначе — PENDING_EMAIL (ожидает подтверждения email).
   */
  async create(dto: CreateReviewDto, ip?: string) {
    // Honeypot
    if (dto.website) {
      this.logger.warn(`Honeypot triggered from IP ${ip}`);
      // Возвращаем фейковый успех, чтобы бот не догадался
      return { message: 'Спасибо! Отзыв будет опубликован после модерации.' };
    }

    // Минимальное время заполнения
    if (dto.formStartedAt && Date.now() - new Date(dto.formStartedAt).getTime() < MIN_FORM_TIME_MS) {
      this.logger.warn(`Suspiciously fast form submission from IP ${ip}`);
      return { message: 'Спасибо! Отзыв будет опубликован после модерации.' };
    }

    // Валидация
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Рейтинг должен быть от 1 до 5');
    }
    if (!dto.text || dto.text.trim().length < 10) {
      throw new BadRequestException('Текст отзыва должен быть не менее 10 символов');
    }
    if (!dto.authorName || dto.authorName.trim().length < 2) {
      throw new BadRequestException('Укажите имя (минимум 2 символа)');
    }
    if (!dto.authorEmail || !dto.authorEmail.includes('@')) {
      throw new BadRequestException('Укажите корректный email');
    }

    // Хотя бы одна цель обязательна
    if (!dto.eventId && !dto.venueId) {
      throw new BadRequestException('Укажите событие или место для отзыва');
    }

    // Проверить что событие существует
    let event: { id: string; title: string; slug: string } | null = null;
    if (dto.eventId) {
      event = await this.prisma.event.findUnique({
        where: { id: dto.eventId },
        select: { id: true, title: true, slug: true },
      });
      if (!event) throw new NotFoundException('Событие не найдено');
    }

    // Проверить что место существует
    let venue: { id: string; title: string; slug: string } | null = null;
    if (dto.venueId) {
      venue = await this.prisma.venue.findUnique({
        where: { id: dto.venueId },
        select: { id: true, title: true, slug: true },
      });
      if (!venue) throw new NotFoundException('Место не найдено');
    }

    // Проверить дубликат (один email — один отзыв на событие/место)
    const existing = await this.prisma.review.findFirst({
      where: {
        authorEmail: dto.authorEmail.toLowerCase().trim(),
        eventId: dto.eventId || null,
        venueId: dto.venueId || null,
      },
    });
    if (existing) {
      throw new ConflictException(
        dto.venueId ? 'Вы уже оставляли отзыв на это место' : 'Вы уже оставляли отзыв на это событие',
      );
    }

    // Определить верификацию и начальный статус
    let isVerified = false;
    let skipEmailVerify = false;

    // Верификация через voucher
    if (dto.voucherCode && dto.eventId) {
      const voucher = await this.prisma.voucher.findUnique({
        where: { shortCode: dto.voucherCode },
        include: {
          package: {
            include: {
              items: { select: { eventId: true } },
            },
          },
        },
      });
      if (voucher) {
        const packageEventIds = voucher.package.items.map((i) => i.eventId);
        if (packageEventIds.includes(dto.eventId)) {
          isVerified = true;
          skipEmailVerify = true;
        }
      }
    }

    // Верификация через ReviewRequest token (post-purchase)
    if (dto.reviewRequestToken && dto.eventId) {
      const request = await this.prisma.reviewRequest.findUnique({
        where: { token: dto.reviewRequestToken },
      });
      if (request && request.eventId === dto.eventId) {
        isVerified = true;
        skipEmailVerify = true;
      }
    }

    // Генерация verify token
    const verifyToken = skipEmailVerify ? null : randomBytes(32).toString('hex');
    const status = skipEmailVerify ? 'PENDING' : 'PENDING_EMAIL';

    const review = await this.prisma.review.create({
      data: {
        eventId: dto.eventId || null,
        venueId: dto.venueId || null,
        rating: dto.rating,
        title: dto.title?.trim() || null,
        text: dto.text.trim(),
        authorName: dto.authorName.trim(),
        authorEmail: dto.authorEmail.toLowerCase().trim(),
        isVerified,
        voucherCode: dto.voucherCode || null,
        verifyToken,
        status,
      },
    });

    // Отправить email-верификацию или уведомить админа
    const entityTitle = event?.title || venue?.title || 'Событие';

    if (!skipEmailVerify) {
      const verifyUrl = `${this.appUrl}/api/v1/reviews/verify?token=${verifyToken}`;
      await this.emailQueue.add('review-verify', {
        type: 'review-verify',
        to: dto.authorEmail.toLowerCase().trim(),
        authorName: dto.authorName.trim(),
        eventTitle: entityTitle,
        verifyUrl,
      });
    } else {
      // Сразу уведомить админа
      await this.emailQueue.add('admin-new-review', {
        type: 'admin-new-review',
        authorName: dto.authorName.trim(),
        eventTitle: entityTitle,
        rating: dto.rating,
        text: dto.text.trim(),
      });

      // Обновить ReviewRequest если пришёл по ссылке
      if (dto.reviewRequestToken) {
        await this.prisma.reviewRequest.updateMany({
          where: { token: dto.reviewRequestToken },
          data: { reviewId: review.id },
        });
      }
    }

    return {
      id: review.id,
      status: review.status,
      message: skipEmailVerify
        ? 'Спасибо! Отзыв будет опубликован после модерации.'
        : 'Проверьте почту — мы отправили ссылку для подтверждения.',
    };
  }

  // ========================
  // Email-верификация
  // ========================

  /**
   * Подтвердить email → перевести из PENDING_EMAIL в PENDING.
   */
  async verifyEmail(token: string) {
    const review = await this.prisma.review.findUnique({
      where: { verifyToken: token },
      include: { event: { select: { title: true } } },
    });

    if (!review) throw new NotFoundException('Ссылка недействительна');

    // Проверить TTL
    if (Date.now() - review.createdAt.getTime() > VERIFY_TOKEN_TTL_MS) {
      await this.prisma.review.delete({ where: { id: review.id } });
      throw new BadRequestException('Ссылка истекла. Пожалуйста, оставьте отзыв заново.');
    }

    if (review.status !== 'PENDING_EMAIL') {
      return { message: 'Отзыв уже подтверждён' };
    }

    await this.prisma.review.update({
      where: { id: review.id },
      data: { status: 'PENDING', verifyToken: null },
    });

    // Уведомить админа
    await this.emailQueue.add('admin-new-review', {
      type: 'admin-new-review',
      authorName: review.authorName,
      eventTitle: review.event?.title || 'Событие',
      rating: review.rating,
      text: review.text,
    });

    return { message: 'Email подтверждён! Отзыв отправлен на модерацию.' };
  }

  // ========================
  // Фото
  // ========================

  /**
   * Добавить фото к отзыву.
   */
  async addPhotos(reviewId: string, files: Express.Multer.File[], authorEmail?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { photos: true },
    });
    if (!review) throw new NotFoundException('Отзыв не найден');

    // Только автор может добавлять фото (проверка по email)
    if (authorEmail && review.authorEmail !== authorEmail.toLowerCase().trim()) {
      throw new ForbiddenException('Вы не можете редактировать этот отзыв');
    }

    // Проверить лимит фото
    const currentCount = review.photos.length;
    if (currentCount + files.length > MAX_PHOTOS_PER_REVIEW) {
      throw new BadRequestException(
        `Максимум ${MAX_PHOTOS_PER_REVIEW} фото. Текущих: ${currentCount}, новых: ${files.length}`,
      );
    }

    const results: ProcessedImage[] = [];
    for (const file of files) {
      const processed = await this.upload.processAndSave(file);
      results.push(processed);
    }

    // Сохранить в БД
    const photos = await Promise.all(
      results.map((img, i) =>
        this.prisma.reviewPhoto.create({
          data: {
            reviewId,
            url: img.url,
            thumbUrl: img.thumbUrl,
            filename: img.filename,
            thumbFilename: img.thumbFilename,
            sortOrder: currentCount + i,
          },
        }),
      ),
    );

    return photos;
  }

  // ========================
  // Голосование
  // ========================

  /**
   * Голосовать за отзыв (полезный / нет).
   */
  async vote(reviewId: string, ip: string, helpful: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Отзыв не найден');
    if (review.status !== 'APPROVED') {
      throw new BadRequestException('Голосовать можно только за опубликованные отзывы');
    }

    const ipHash = createHash('sha256').update(ip).digest('hex');

    // Upsert: один голос на IP на отзыв
    const existing = await this.prisma.reviewVote.findUnique({
      where: { reviewId_ipHash: { reviewId, ipHash } },
    });

    if (existing) {
      if (existing.isHelpful === helpful) {
        // Убрать голос (toggle)
        await this.prisma.reviewVote.delete({
          where: { id: existing.id },
        });
      } else {
        // Изменить голос
        await this.prisma.reviewVote.update({
          where: { id: existing.id },
          data: { isHelpful: helpful },
        });
      }
    } else {
      await this.prisma.reviewVote.create({
        data: { reviewId, ipHash, isHelpful: helpful },
      });
    }

    // Пересчитать helpfulCount
    const helpfulCount = await this.prisma.reviewVote.count({
      where: { reviewId, isHelpful: true },
    });

    await this.prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount },
    });

    return { helpfulCount };
  }

  // ========================
  // Публичное получение отзывов
  // ========================

  /**
   * Получить одобренные отзывы для события + внешние отзывы.
   */
  async getByEventSlug(slug: string, page = 1, limit = 10) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Событие не найдено');

    const where: Prisma.ReviewWhereInput = {
      eventId: event.id,
      status: 'APPROVED',
    };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: [{ isVerified: 'desc' }, { helpfulCount: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          rating: true,
          title: true,
          text: true,
          authorName: true,
          isVerified: true,
          helpfulCount: true,
          createdAt: true,
          photos: {
            select: { id: true, url: true, thumbUrl: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    // Внешние отзывы (первая страница)
    let externalReviews: any[] = [];
    if (page === 1) {
      externalReviews = await this.prisma.externalReview.findMany({
        where: { eventId: event.id },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          source: true,
          sourceUrl: true,
          authorName: true,
          rating: true,
          text: true,
          publishedAt: true,
        },
      });
    }

    // Рейтинг-сводка
    const summary = await this.getEventRatingSummary(event.id);

    return {
      items,
      externalReviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary,
    };
  }

  /**
   * Получить одобренные отзывы для места (venue).
   */
  async getByVenueSlug(slug: string, page = 1, limit = 10) {
    const venue = await this.prisma.venue.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!venue) throw new NotFoundException('Место не найдено');

    const where: Prisma.ReviewWhereInput = {
      venueId: venue.id,
      status: 'APPROVED',
    };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: [{ isVerified: 'desc' }, { helpfulCount: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          rating: true,
          title: true,
          text: true,
          authorName: true,
          isVerified: true,
          helpfulCount: true,
          createdAt: true,
          photos: {
            select: { id: true, url: true, thumbUrl: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    const summary = await this.getVenueRatingSummary(venue.id);

    return {
      items,
      externalReviews: [] as any[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary,
    };
  }

  /**
   * Рейтинг-сводка для места: средний балл + разбивка по звёздам.
   */
  async getVenueRatingSummary(venueId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { venueId, status: 'APPROVED' },
      select: { rating: true, isVerified: true },
    });

    if (reviews.length === 0) {
      return {
        avgRating: 0,
        reviewCount: 0,
        verifiedCount: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = Math.round((sum / reviews.length) * 10) / 10;
    const verifiedCount = reviews.filter((r) => r.isVerified).length;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) {
      distribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
    }

    return {
      avgRating,
      reviewCount: reviews.length,
      verifiedCount,
      distribution,
    };
  }

  /**
   * Рейтинг-сводка для события: средний балл + разбивка по звёздам.
   */
  async getEventRatingSummary(eventId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { eventId, status: 'APPROVED' },
      select: { rating: true, isVerified: true },
    });

    if (reviews.length === 0) {
      return {
        avgRating: 0,
        reviewCount: 0,
        verifiedCount: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = Math.round((sum / reviews.length) * 10) / 10;
    const verifiedCount = reviews.filter((r) => r.isVerified).length;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) {
      distribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
    }

    return {
      avgRating,
      reviewCount: reviews.length,
      verifiedCount,
      distribution,
    };
  }

  /**
   * Пересчитать Event.rating и Event.reviewCount на основе одобренных отзывов.
   * Учитывает externalRating + externalReviews (из таблицы external_reviews).
   */
  async recalculateEventRating(eventId: string) {
    const summary = await this.getEventRatingSummary(eventId);
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { externalRating: true, externalReviewCount: true },
    });

    // Также считаем средний рейтинг из ExternalReview
    const extReviews = await this.prisma.externalReview.findMany({
      where: { eventId },
      select: { rating: true },
    });

    let finalRating = summary.avgRating;
    let finalCount = summary.reviewCount;

    // Если есть externalRating (ручной ввод) — взвешенное среднее
    if (event?.externalRating && Number(event.externalRating) > 0) {
      const extRating = Number(event.externalRating);
      const extCount = event.externalReviewCount || 0;

      if (summary.reviewCount > 0 && extCount > 0) {
        finalRating =
          Math.round(
            ((summary.avgRating * summary.reviewCount + extRating * extCount) / (summary.reviewCount + extCount)) * 10,
          ) / 10;
        finalCount = summary.reviewCount + extCount;
      } else if (summary.reviewCount === 0) {
        finalRating = extRating;
        finalCount = extCount;
      }
    }

    // Если есть external_reviews (из таблицы) — тоже учитываем
    if (extReviews.length > 0) {
      const extSum = extReviews.reduce((acc, r) => acc + r.rating, 0);
      const extAvg = extSum / extReviews.length;
      if (finalCount > 0) {
        finalRating =
          Math.round(
            ((finalRating * finalCount + extAvg * extReviews.length) / (finalCount + extReviews.length)) * 10,
          ) / 10;
      } else {
        finalRating = Math.round(extAvg * 10) / 10;
      }
      finalCount += extReviews.length;
    }

    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        rating: finalRating,
        reviewCount: finalCount,
      },
    });

    this.logger.log(
      `Event ${eventId}: rating=${finalRating}, reviewCount=${finalCount} (own=${summary.reviewCount}, ext=${extReviews.length})`,
    );

    return { rating: finalRating, reviewCount: finalCount };
  }

  /**
   * Пересчитать Venue.rating и Venue.reviewCount на основе прямых отзывов (venueId).
   */
  async recalculateVenueRating(venueId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { venueId, status: 'APPROVED' },
      select: { rating: true },
    });

    // Также учитываем отзывы через привязанные events
    const eventReviews = await this.prisma.review.findMany({
      where: {
        event: { venueId },
        status: 'APPROVED',
        venueId: null, // Не считать дважды прямые venue-отзывы
      },
      select: { rating: true },
    });

    const allReviews = [...reviews, ...eventReviews];

    if (allReviews.length === 0) {
      await this.prisma.venue.update({
        where: { id: venueId },
        data: { rating: 0, reviewCount: 0 },
      });
      return;
    }

    const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = Math.round((sum / allReviews.length) * 10) / 10;

    await this.prisma.venue.update({
      where: { id: venueId },
      data: { rating: avgRating, reviewCount: allReviews.length },
    });

    this.logger.log(
      `Venue ${venueId}: rating=${avgRating}, reviewCount=${allReviews.length} (direct=${reviews.length}, event=${eventReviews.length})`,
    );
  }

  // ========================
  // Admin
  // ========================

  /**
   * Список отзывов для админки.
   */
  async adminList(filters: { status?: string; eventId?: string; venueId?: string; page?: number; limit?: number }) {
    const { status, eventId, venueId, page = 1, limit = 20 } = filters;
    const where: Prisma.ReviewWhereInput = {};
    if (status) where.status = status as ReviewStatus;
    if (eventId) where.eventId = eventId;
    if (venueId) where.venueId = venueId;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          event: { select: { id: true, title: true, slug: true } },
          venue: { select: { id: true, title: true, slug: true } },
          photos: {
            select: { id: true, url: true, thumbUrl: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    // Кол-во pending для счётчика
    const pendingCount = await this.prisma.review.count({ where: { status: 'PENDING' } });

    return { items, total, page, pages: Math.ceil(total / limit), pendingCount };
  }

  /**
   * Approve или reject отзыва.
   */
  async adminModerate(reviewId: string, action: 'approve' | 'reject', adminComment?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        event: { select: { title: true, slug: true } },
        venue: { select: { title: true, slug: true } },
      },
    });
    if (!review) throw new NotFoundException('Отзыв не найден');

    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { status, adminComment: adminComment || null },
    });

    // Пересчитать рейтинг события
    if (review.eventId) {
      await this.recalculateEventRating(review.eventId);
    }

    // Пересчитать рейтинг места
    if (review.venueId) {
      await this.recalculateVenueRating(review.venueId);
    }

    // Уведомить автора об одобрении
    if (action === 'approve' && review.authorEmail) {
      const entitySlug = review.event?.slug || review.venue?.slug || '';
      const entityPath = review.venueId ? 'venues' : 'events';
      const entityUrl = `${this.appUrl}/${entityPath}/${entitySlug}`;
      await this.emailQueue.add('review-approved', {
        type: 'review-approved',
        to: review.authorEmail,
        authorName: review.authorName,
        eventTitle: review.event?.title || review.venue?.title || 'Событие',
        eventUrl: entityUrl,
      });
    }

    return updated;
  }

  /**
   * Удалить отзыв.
   */
  async adminDelete(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { photos: true },
    });
    if (!review) throw new NotFoundException('Отзыв не найден');

    // Удалить файлы фото
    for (const photo of review.photos) {
      await this.upload.deleteImage(photo.filename, photo.thumbFilename);
    }

    await this.prisma.review.delete({ where: { id: reviewId } });

    // Пересчитать рейтинг события
    if (review.eventId) {
      await this.recalculateEventRating(review.eventId);
    }

    // Пересчитать рейтинг места
    if (review.venueId) {
      await this.recalculateVenueRating(review.venueId);
    }

    return { message: 'Отзыв удалён' };
  }

  // ========================
  // Внешние отзывы (Admin CRUD)
  // ========================

  async createExternalReview(data: {
    eventId?: string;
    operatorId?: string;
    source: string;
    sourceUrl?: string;
    authorName: string;
    rating: number;
    text: string;
    publishedAt?: string;
  }) {
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Рейтинг должен быть от 1 до 5');
    }

    const review = await this.prisma.externalReview.create({
      data: {
        eventId: data.eventId || null,
        operatorId: data.operatorId || null,
        source: data.source,
        sourceUrl: data.sourceUrl || null,
        authorName: data.authorName,
        rating: data.rating,
        text: data.text,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      },
    });

    // Пересчитать рейтинг
    if (data.eventId) {
      await this.recalculateEventRating(data.eventId);
    }

    return review;
  }

  async listExternalReviews(filters: { eventId?: string; source?: string; page?: number; limit?: number }) {
    const { eventId, source, page = 1, limit = 20 } = filters;
    const where: Prisma.ExternalReviewWhereInput = {};
    if (eventId) where.eventId = eventId;
    if (source) where.source = source;

    const [items, total] = await Promise.all([
      this.prisma.externalReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          event: { select: { id: true, title: true, slug: true } },
        },
      }),
      this.prisma.externalReview.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  // ========================
  // Review Request Info (for pre-filled form)
  // ========================

  async getReviewRequestInfo(token: string) {
    const request = await this.prisma.reviewRequest.findUnique({
      where: { token },
      include: {
        event: { select: { id: true, title: true, slug: true } },
      },
    });

    if (!request) throw new NotFoundException('Ссылка недействительна');

    // Отметить клик
    if (!request.clickedAt) {
      await this.prisma.reviewRequest.update({
        where: { id: request.id },
        data: { clickedAt: new Date() },
      });
    }

    return {
      eventId: request.eventId,
      eventTitle: request.event.title,
      eventSlug: request.event.slug,
      email: request.email,
    };
  }

  async deleteExternalReview(id: string) {
    const review = await this.prisma.externalReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Внешний отзыв не найден');

    await this.prisma.externalReview.delete({ where: { id } });

    if (review.eventId) {
      await this.recalculateEventRating(review.eventId);
    }

    return { message: 'Внешний отзыв удалён' };
  }
}
