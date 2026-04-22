import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ReviewDisputeReasonCode,
  ReviewDisputeStatus,
  ReviewStatus,
  ReviewSupplierResponseStatus,
} from '@/prisma-client';
import { randomUUID } from 'crypto';

import { PaginatedResult, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewCapabilityService } from '../review/review-capability.service';
import { STORAGE_PROVIDER, StorageProvider } from '../upload/storage.provider';
import { CreateDisputeDto, CreateSupplierResponseDto } from './dto/supplier-reviews.dto';

const MAX_EVIDENCE_FILES = 5;
const MAX_EVIDENCE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EVIDENCE_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];

@Injectable()
export class SupplierReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewCapability: ReviewCapabilityService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /** Отзывы поставщика: фильтр по tab */
  async list(
    operatorId: string,
    tab: 'all' | 'needs_response' | 'disputed' | 'responded' = 'all',
    pagination: { page?: string; limit?: string },
  ): Promise<PaginatedResult<ReviewListItem>> {
    const params = parsePagination({ page: pagination.page, limit: pagination.limit });
    const where: Prisma.ReviewWhereInput = {
      supplierId: operatorId,
      status: ReviewStatus.APPROVED,
    };

    if (tab === 'needs_response') {
      where.rating = { lte: 3 };
      where.supplierResponse = null;
    } else if (tab === 'disputed') {
      where.disputes = {
        some: { status: ReviewDisputeStatus.MODERATOR_REVIEW },
      };
    } else if (tab === 'responded') {
      where.supplierResponse = {
        status: ReviewSupplierResponseStatus.APPROVED,
      };
    }

    const [items, total, anyForSupplier] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        select: this.reviewListSelect(),
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.findFirst({ where: { supplierId: operatorId } }),
    ]);

    // Временное логирование для отладки сида/фильтров
    // eslint-disable-next-line no-console
    console.log('SupplierReviewsService.list', {
      operatorId,
      tab,
      total,
      anyForSupplier: anyForSupplier
        ? { id: anyForSupplier.id, status: anyForSupplier.status, supplierId: anyForSupplier.supplierId }
        : null,
    });

    return {
      items,
      total,
      nextCursor: null,
      hasMore: (params.page - 1) * params.limit + items.length < total,
    };
  }

  /** Детали отзыва (для поставщика) */
  async getOne(operatorId: string, reviewId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, supplierId: operatorId },
      select: {
        id: true,
        eventId: true,
        rating: true,
        title: true,
        text: true,
        authorName: true,
        isVerified: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        photos: { select: { id: true, url: true, thumbUrl: true }, orderBy: { sortOrder: 'asc' } },
        event: { select: { id: true, title: true, slug: true } },
        supplierResponse: {
          select: {
            id: true,
            text: true,
            status: true,
            moderationComment: true,
            moderatedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        disputes: {
          where: { status: ReviewDisputeStatus.MODERATOR_REVIEW },
          select: {
            id: true,
            reasonCode: true,
            claimText: true,
            status: true,
            createdAt: true,
            evidence: { select: { id: true, storageKey: true, fileName: true, mimeType: true, fileSize: true } },
          },
        },
      },
    });
    if (!review) throw new NotFoundException('Отзыв не найден');
    return review;
  }

  /** Создать или обновить черновик ответа */
  async upsertResponse(
    operatorId: string,
    userId: string,
    reviewId: string,
    dto: CreateSupplierResponseDto,
  ) {
    await this.ensureReviewOwnership(operatorId, reviewId);
    const existing = await this.prisma.reviewSupplierResponse.findUnique({
      where: { reviewId },
    });
    if (existing) {
      if (existing.status !== ReviewSupplierResponseStatus.DRAFT) {
        throw new BadRequestException('Ответ уже отправлен на модерацию или одобрен');
      }
      return this.prisma.reviewSupplierResponse.update({
        where: { reviewId },
        data: { text: dto.text },
      });
    }
    return this.prisma.reviewSupplierResponse.create({
      data: {
        reviewId,
        supplierId: operatorId,
        text: dto.text,
        status: ReviewSupplierResponseStatus.DRAFT,
      },
    });
  }

  /** Отправить ответ на модерацию */
  async submitResponse(operatorId: string, userId: string, reviewId: string) {
    await this.ensureReviewOwnership(operatorId, reviewId);
    const response = await this.prisma.reviewSupplierResponse.findUnique({
      where: { reviewId },
    });
    if (!response) throw new BadRequestException('Сначала создайте ответ');
    if (response.status !== ReviewSupplierResponseStatus.DRAFT) {
      throw new BadRequestException('Ответ уже отправлен на модерацию или одобрен');
    }
    await this.prisma.reviewSupplierResponse.update({
      where: { reviewId },
      data: { status: ReviewSupplierResponseStatus.PENDING_MODERATION },
    });
    await this.logAction(reviewId, null, 'supplier', userId, 'SUPPLIER_RESPONSE_SUBMITTED', {});
    return { message: 'Ответ отправлен на модерацию' };
  }

  /** Принять отзыв без оспаривания (если rating > 3 или не требует ответа) */
  async accept(operatorId: string, userId: string, reviewId: string) {
    await this.ensureReviewOwnership(operatorId, reviewId);
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { disputes: { where: { status: ReviewDisputeStatus.MODERATOR_REVIEW } }, supplierResponse: true },
    });
    if (!review) throw new NotFoundException('Отзыв не найден');
    if (review.disputes.length > 0) throw new BadRequestException('Отзыв уже оспорен');
    if (review.supplierResponse) throw new BadRequestException('Ответ уже создан');
    await this.logAction(reviewId, null, 'supplier', userId, 'SUPPLIER_ACCEPTED_REVIEW', {});
    return { message: 'Отзыв принят' };
  }

  /** Создать dispute */
  async createDispute(
    operatorId: string,
    userId: string,
    reviewId: string,
    dto: CreateDisputeDto,
  ) {
    await this.ensureReviewOwnership(operatorId, reviewId);
    const existing = await this.prisma.reviewDispute.findUnique({
      where: { reviewId },
    });
    if (existing) {
      if (existing.status === ReviewDisputeStatus.MODERATOR_REVIEW) {
        throw new BadRequestException('Отзыв уже оспорен и ожидает проверки');
      }
      throw new BadRequestException('По этому отзыву уже есть закрытое оспаривание');
    }
    const dispute = await this.prisma.reviewDispute.create({
      data: {
        reviewId,
        supplierId: operatorId,
        reasonCode: dto.reasonCode as ReviewDisputeReasonCode,
        claimText: dto.claimText,
        supplierConfirmedTruth: dto.supplierConfirmedTruth,
      },
    });
    await this.logAction(reviewId, dispute.id, 'supplier', userId, 'DISPUTE_CREATED', { reasonCode: dto.reasonCode });
    return dispute;
  }

  /** Добавить evidence к dispute */
  async addEvidence(
    operatorId: string,
    disputeId: string,
    file: Express.Multer.File,
  ) {
    const dispute = await this.prisma.reviewDispute.findFirst({
      where: { id: disputeId, supplierId: operatorId },
      include: { evidence: true },
    });
    if (!dispute) throw new NotFoundException('Оспаривание не найдено');
    if (dispute.status !== ReviewDisputeStatus.MODERATOR_REVIEW) {
      throw new BadRequestException('Нельзя добавлять доказательства к закрытому оспариванию');
    }
    if (dispute.evidence.length >= MAX_EVIDENCE_FILES) {
      throw new BadRequestException(`Максимум ${MAX_EVIDENCE_FILES} файлов`);
    }
    if (file.size > MAX_EVIDENCE_SIZE_BYTES) {
      throw new BadRequestException('Максимальный размер файла 25 МБ');
    }
    if (!ALLOWED_EVIDENCE_MIMES.includes(file.mimetype)) {
      throw new BadRequestException('Разрешены только jpg, png, pdf');
    }
    const ext = file.mimetype === 'application/pdf' ? 'pdf' : file.mimetype === 'image/png' ? 'png' : 'jpg';
    const storageKey = `ev-${randomUUID()}.${ext}`;
    const url = await this.storage.save(storageKey, file.buffer);
    await this.prisma.reviewDisputeEvidence.create({
      data: {
        disputeId,
        storageKey,
        fileName: file.originalname || storageKey,
        mimeType: file.mimetype,
        fileSize: file.size,
      },
    });
    return { url, storageKey };
  }

  /** Список disputes поставщика */
  async listDisputes(operatorId: string, pagination: { page?: string; limit?: string }) {
    const params = parsePagination({ page: pagination.page, limit: pagination.limit });
    const where: Prisma.ReviewDisputeWhereInput = { supplierId: operatorId };
    const [items, total] = await Promise.all([
      this.prisma.reviewDispute.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        select: {
          id: true,
          reviewId: true,
          reasonCode: true,
          claimText: true,
          status: true,
          createdAt: true,
          review: { select: { id: true, rating: true, text: true, event: { select: { title: true, slug: true } } } },
        },
      }),
      this.prisma.reviewDispute.count({ where }),
    ]);
    return {
      items,
      total,
      nextCursor: null,
      hasMore: (params.page - 1) * params.limit + items.length < total,
    };
  }

  private async ensureReviewOwnership(operatorId: string, reviewId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, supplierId: operatorId },
    });
    if (!review) throw new NotFoundException('Отзыв не найден');
  }

  private reviewListSelect() {
    return {
      id: true,
      eventId: true,
      rating: true,
      title: true,
      text: true,
      authorName: true,
      isVerified: true,
      createdAt: true,
      event: { select: { title: true, slug: true } },
      supplierResponse: { select: { id: true, status: true, moderatedAt: true } },
      disputes: {
        where: { status: ReviewDisputeStatus.MODERATOR_REVIEW },
        select: { id: true },
        take: 1,
      },
    };
  }

  private async logAction(
    reviewId: string | null,
    disputeId: string | null,
    actorType: string,
    actorId: string,
    actionType: string,
    payload: Record<string, unknown>,
  ) {
    await this.prisma.reviewActionLog.create({
      data: { reviewId, disputeId, actorType, actorId, actionType, payload: payload as Prisma.InputJsonValue },
    });
  }
}

type ReviewListItem = Prisma.ReviewGetPayload<{
  select: ReturnType<SupplierReviewsService['reviewListSelect']>;
}>;
