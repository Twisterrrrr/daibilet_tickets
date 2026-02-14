import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, Request, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { parsePagination, paginationArgs, buildPaginatedResult } from '../common/pagination';
import { EventOverrideService } from './event-override.service';
import { ReviewService } from '../catalog/review.service';
import { FuzzyDedupService } from '../catalog/fuzzy-dedup.service';
import { validateWidgetPayload, ensurePayloadVersion } from '@daibilet/shared';
import {
  OfferSource,
  EventCategory,
  EventSubcategory,
  EventAudience,
  PurchaseType,
  OfferStatus,
  DateMode,
  Prisma,
} from '@prisma/client';
import {
  CreateEventDto,
  CreateEventOfferDto,
  UpdateEventOfferDto,
  PatchEventOfferDto,
  OverrideEventDto,
  VenueSettingsDto,
  ExternalRatingDto,
} from './dto/admin-event.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/events')
export class AdminEventsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly overrideService: EventOverrideService,
    private readonly reviewService: ReviewService,
    private readonly fuzzyDedupService: FuzzyDedupService,
  ) {}

  @Get()
  async list(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('source') source?: string,
    @Query('active') active?: string,
    @Query('hidden') hidden?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit });
    const where: any = {};
    if (city) where.city = { slug: city };
    if (category) where.category = category;
    if (source) where.source = source;
    if (active !== undefined) where.isActive = active === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rawItems, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          city: { select: { slug: true, name: true } },
          _count: { select: { sessions: true, tags: true, offers: true } },
          override: true,
        },
        orderBy: { updatedAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.event.count({ where }),
    ]);

    // Опционально: фильтрация по isHidden через override
    let filtered = rawItems;
    if (hidden === 'true') {
      filtered = rawItems.filter((e: any) => e.override?.isHidden === true);
    } else if (hidden === 'false') {
      filtered = rawItems.filter((e: any) => !e.override?.isHidden);
    }

    return buildPaginatedResult(filtered, total, pg.limit);
  }

  /**
   * Fuzzy deduplication: find (and optionally merge) near-duplicate events.
   * By default runs in dry-run mode (returns candidates only).
   * Pass ?dryRun=false to actually merge duplicates.
   */
  @Post('deduplicate-fuzzy')
  @Roles('ADMIN')
  async deduplicateFuzzy(@Query('dryRun') dryRun?: string) {
    const isDryRun = dryRun !== 'false';
    return this.fuzzyDedupService.findDuplicates(isDryRun);
  }

  /**
   * Создать новое событие (ручное) + опционально первый оффер.
   */
  @Post()
  @Roles('ADMIN', 'EDITOR')
  async createEvent(@Body() data: CreateEventDto) {
    // Auto-generate slug from title via transliteration
    const slug = this.transliterate(data.title);

    // Check uniqueness
    const existing = await this.prisma.event.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException(`Событие со slug "${slug}" уже существует`);
    }

    // Verify city exists
    const city = await this.prisma.city.findUnique({ where: { id: data.cityId } });
    if (!city) throw new NotFoundException('Город не найден');

    // Create in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create event — generate a unique tcEventId for manual events
      const event = await tx.event.create({
        data: {
          source: OfferSource.MANUAL,
          tcEventId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          cityId: data.cityId,
          title: data.title,
          slug,
          description: data.description || null,
          shortDescription: data.shortDescription || null,
          category: data.category as EventCategory,
          subcategories: (data.subcategories || []) as EventSubcategory[],
          audience: (data.audience as EventAudience) || EventAudience.ALL,
          minAge: data.minAge || 0,
          durationMinutes: data.durationMinutes || null,
          address: data.address || null,
          lat: data.lat || null,
          lng: data.lng || null,
          imageUrl: data.imageUrl || null,
          galleryUrls: data.galleryUrls || [],
          priceFrom: data.offer?.priceFrom || null,
          isActive: true,
        },
      });

      // Create first offer if provided
      let offer = null;
      if (data.offer) {
        offer = await tx.eventOffer.create({
          data: {
            eventId: event.id,
            source: (data.offer.source as OfferSource) || OfferSource.MANUAL,
            purchaseType: data.offer.purchaseType as PurchaseType,
            deeplink: data.offer.deeplink || null,
            priceFrom: data.offer.priceFrom || null,
            commissionPercent: data.offer.commissionPercent || null,
            availabilityMode: data.offer.availabilityMode || null,
            badge: data.offer.badge || null,
            operatorId: data.offer.operatorId || null,
            isPrimary: true,
            status: 'ACTIVE',
          },
        });
      }

      return { event, offer };
    });

    return result;
  }

  /** Транслитерация заголовка в slug */
  private transliterate(text: string): string {
    const map: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    };
    return text
      .toLowerCase()
      .split('')
      .map((c) => map[c] ?? c)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.event.findUniqueOrThrow({
      where: { id },
      include: {
        city: { select: { slug: true, name: true } },
        sessions: { where: { isActive: true }, orderBy: { startsAt: 'asc' }, take: 20 },
        tags: { include: { tag: true } },
        offers: {
          orderBy: [{ isPrimary: 'desc' }, { priority: 'desc' }],
          include: {
            _count: { select: { sessions: true } },
            operator: { select: { id: true, name: true, slug: true } },
          },
        },
        override: true,
      },
    });
  }

  // --- Override endpoints ---

  /**
   * Создать/обновить override для события.
   */
  @Patch(':id/override')
  @Roles('ADMIN', 'EDITOR')
  async upsertOverride(@Param('id') id: string, @Body() data: OverrideEventDto, @Request() req: any) {
    return this.overrideService.upsert(id, data, req.user.id);
  }

  /**
   * Удалить override — вернуть к данным из sync.
   */
  @Delete(':id/override')
  @Roles('ADMIN', 'EDITOR')
  async deleteOverride(@Param('id') id: string) {
    const result = await this.overrideService.remove(id);
    return result || { message: 'Override не найден' };
  }

  /**
   * Toggle скрытия события.
   */
  @Patch(':id/hide')
  @Roles('ADMIN', 'EDITOR')
  async toggleHide(@Param('id') id: string, @Body('isHidden') isHidden: boolean, @Request() req: any) {
    return this.overrideService.toggleHidden(id, isHidden, req.user.id);
  }

  // --- Venue & dateMode (прямое обновление Event) ---

  @Patch(':id/venue-settings')
  @Roles('ADMIN', 'EDITOR')
  async updateVenueSettings(@Param('id') id: string, @Body() data: VenueSettingsDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Событие не найдено');

    // Validate venue exists if provided
    if (data.venueId) {
      const venue = await this.prisma.venue.findUnique({ where: { id: data.venueId } });
      if (!venue) throw new NotFoundException('Место (Venue) не найдено');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...(data.venueId !== undefined && { venueId: data.venueId || null }),
        ...(data.dateMode && { dateMode: data.dateMode as DateMode }),
        ...(data.isPermanent !== undefined && { isPermanent: data.isPermanent }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
      },
      select: {
        id: true,
        venueId: true,
        dateMode: true,
        isPermanent: true,
        endDate: true,
      },
    });
  }

  // --- External rating (ручной ввод из Яндекс/2GIS) ---

  @Patch(':id/external-rating')
  @Roles('ADMIN', 'EDITOR')
  async updateExternalRating(@Param('id') id: string, @Body() data: ExternalRatingDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Событие не найдено');

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        externalRating: data.externalRating ?? null,
        externalReviewCount: data.externalReviewCount ?? null,
        externalSource: data.externalSource ?? null,
      },
      select: {
        id: true,
        externalRating: true,
        externalReviewCount: true,
        externalSource: true,
        rating: true,
        reviewCount: true,
      },
    });

    // Пересчитать итоговый рейтинг
    await this.reviewService.recalculateEventRating(id);

    return updated;
  }

  // --- Offer endpoints ---

  /**
   * Список офферов для события.
   */
  @Get(':id/offers')
  async listOffers(@Param('id') id: string) {
    return this.prisma.eventOffer.findMany({
      where: { eventId: id },
      orderBy: [{ isPrimary: 'desc' }, { priority: 'desc' }],
      include: {
        _count: { select: { sessions: true } },
        operator: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  /**
   * Создать новый оффер для события.
   */
  @Post(':id/offers')
  @Roles('ADMIN', 'EDITOR')
  async createOffer(@Param('id') eventId: string, @Body() data: CreateEventOfferDto) {
    // Verify event exists
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Событие не найдено');

    // If setting isPrimary, unset others
    if (data.isPrimary) {
      await this.prisma.eventOffer.updateMany({
        where: { eventId },
        data: { isPrimary: false },
      });
    }

    // WIDGET contract: auto-fill + validate
    let widgetProvider = data.widgetProvider || null;
    let widgetPayload = data.widgetPayload || null;
    if (data.purchaseType === 'WIDGET') {
      if (!widgetProvider) {
        widgetProvider = data.source || 'TC';
      }
      if (!widgetPayload) {
        widgetPayload = {
          v: 1,
          externalEventId: data.externalEventId || null,
          metaEventId: data.metaEventId || null,
        };
      } else {
        widgetPayload = ensurePayloadVersion(widgetPayload as Record<string, unknown>);
      }
      // Validate
      const validation = validateWidgetPayload(widgetProvider, widgetPayload);
      if (!validation.valid) {
        throw new BadRequestException(`Невалидный widgetPayload: ${validation.errors?.join('; ')}`);
      }
    }

    const offer = await this.prisma.eventOffer.create({
      data: {
        eventId,
        source: data.source as OfferSource,
        purchaseType: data.purchaseType as PurchaseType,
        externalEventId: data.externalEventId || null,
        metaEventId: data.metaEventId || null,
        deeplink: data.deeplink || null,
        priceFrom: data.priceFrom ?? null,
        commissionPercent: data.commissionPercent ?? null,
        priority: data.priority ?? 0,
        isPrimary: data.isPrimary ?? false,
        status: (data.status as OfferStatus) || OfferStatus.ACTIVE,
        availabilityMode: data.availabilityMode || null,
        badge: data.badge || null,
        operatorId: data.operatorId || null,
        widgetProvider,
        widgetPayload: widgetPayload as Prisma.InputJsonValue,
        meetingPoint: data.meetingPoint || null,
        meetingInstructions: data.meetingInstructions || null,
        operationalPhone: data.operationalPhone || null,
        operationalNote: data.operationalNote || null,
      },
      include: {
        _count: { select: { sessions: true } },
        operator: { select: { id: true, name: true, slug: true } },
      },
    });

    // Update event priceFrom if this offer has a lower price
    if (data.priceFrom && (!event.priceFrom || data.priceFrom < event.priceFrom)) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { priceFrom: data.priceFrom },
      });
    }

    return offer;
  }

  /**
   * Полное обновление оффера.
   */
  @Put(':id/offers/:offerId')
  @Roles('ADMIN', 'EDITOR')
  async fullUpdateOffer(
    @Param('id') eventId: string,
    @Param('offerId') offerId: string,
    @Body() data: UpdateEventOfferDto,
  ) {
    const offer = await this.prisma.eventOffer.findFirst({
      where: { id: offerId, eventId },
    });
    if (!offer) throw new NotFoundException('Оффер не найден');

    // If setting isPrimary, unset others
    if (data.isPrimary === true) {
      await this.prisma.eventOffer.updateMany({
        where: { eventId, id: { not: offerId } },
        data: { isPrimary: false },
      });
    }

    const updated = await this.prisma.eventOffer.update({
      where: { id: offerId },
      data: {
        ...(data.source && { source: data.source as OfferSource }),
        ...(data.purchaseType && { purchaseType: data.purchaseType as PurchaseType }),
        ...(data.externalEventId !== undefined && { externalEventId: data.externalEventId || null }),
        ...(data.metaEventId !== undefined && { metaEventId: data.metaEventId || null }),
        ...(data.deeplink !== undefined && { deeplink: data.deeplink || null }),
        ...(data.priceFrom !== undefined && { priceFrom: data.priceFrom ?? null }),
        ...(data.commissionPercent !== undefined && { commissionPercent: data.commissionPercent ?? null }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.status && { status: data.status as OfferStatus }),
        ...(data.availabilityMode !== undefined && { availabilityMode: data.availabilityMode || null }),
        ...(data.badge !== undefined && { badge: data.badge || null }),
        ...(data.operatorId !== undefined && { operatorId: data.operatorId || null }),
        ...(data.widgetProvider !== undefined && { widgetProvider: data.widgetProvider || null }),
        ...(data.widgetPayload !== undefined && { widgetPayload: data.widgetPayload || null }),
        ...(data.meetingPoint !== undefined && { meetingPoint: data.meetingPoint || null }),
        ...(data.meetingInstructions !== undefined && { meetingInstructions: data.meetingInstructions || null }),
        ...(data.operationalPhone !== undefined && { operationalPhone: data.operationalPhone || null }),
        ...(data.operationalNote !== undefined && { operationalNote: data.operationalNote || null }),
      },
      include: {
        _count: { select: { sessions: true } },
        operator: { select: { id: true, name: true, slug: true } },
      },
    });

    return updated;
  }

  /**
   * Частичное обновление оффера (статус, primary, priority, комиссия).
   */
  @Patch(':id/offers/:offerId')
  @Roles('ADMIN', 'EDITOR')
  async updateOffer(
    @Param('id') eventId: string,
    @Param('offerId') offerId: string,
    @Body() data: PatchEventOfferDto,
  ) {
    const offer = await this.prisma.eventOffer.findFirst({
      where: { id: offerId, eventId },
    });
    if (!offer) throw new NotFoundException('Оффер не найден');

    // Если ставим isPrimary — сбросить у остальных
    if (data.isPrimary === true) {
      await this.prisma.eventOffer.updateMany({
        where: { eventId, id: { not: offerId } },
        data: { isPrimary: false },
      });
    }

    return this.prisma.eventOffer.update({
      where: { id: offerId },
      data: {
        ...(data.status && { status: data.status as OfferStatus }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.commissionPercent !== undefined && { commissionPercent: data.commissionPercent }),
      },
    });
  }

  /**
   * Удалить оффер (только MANUAL-источники).
   */
  @Delete(':id/offers/:offerId')
  @Roles('ADMIN', 'EDITOR')
  async deleteOffer(
    @Param('id') eventId: string,
    @Param('offerId') offerId: string,
  ) {
    const offer = await this.prisma.eventOffer.findFirst({
      where: { id: offerId, eventId },
    });
    if (!offer) throw new NotFoundException('Оффер не найден');

    if (offer.source !== 'MANUAL') {
      throw new BadRequestException('Удалять можно только MANUAL-офферы. Синхронизированные офферы скрывайте через статус DISABLED.');
    }

    // Soft-deactivate related sessions
    await this.prisma.eventSession.updateMany({
      where: { offerId },
      data: { isActive: false },
    });

    // Soft-delete оффера
    await this.prisma.eventOffer.update({
      where: { id: offerId },
      data: { isDeleted: true, deletedAt: new Date(), status: 'DISABLED' },
    });

    return { message: 'Оффер удалён (soft-delete)' };
  }

  /**
   * Клонировать оффер (копия всех полей кроме id, priceFrom, deeplink).
   */
  @Post(':id/offers/:offerId/clone')
  @Roles('ADMIN', 'EDITOR')
  async cloneOffer(
    @Param('id') eventId: string,
    @Param('offerId') offerId: string,
  ) {
    const offer = await this.prisma.eventOffer.findFirst({
      where: { id: offerId, eventId },
    });
    if (!offer) throw new NotFoundException('Оффер не найден');

    const clone = await this.prisma.eventOffer.create({
      data: {
        eventId,
        source: 'MANUAL',
        purchaseType: offer.purchaseType,
        externalEventId: null,
        metaEventId: null,
        deeplink: null,
        priceFrom: null,
        commissionPercent: offer.commissionPercent,
        priority: offer.priority,
        isPrimary: false,
        status: 'HIDDEN',
        availabilityMode: offer.availabilityMode,
        badge: offer.badge,
        operatorId: offer.operatorId,
        widgetProvider: offer.widgetProvider,
        widgetPayload: offer.widgetPayload as Prisma.InputJsonValue,
        meetingPoint: offer.meetingPoint,
        meetingInstructions: offer.meetingInstructions,
        operationalPhone: offer.operationalPhone,
        operationalNote: offer.operationalNote,
      },
      include: {
        _count: { select: { sessions: true } },
        operator: { select: { id: true, name: true, slug: true } },
      },
    });

    return clone;
  }

  /**
   * Ручной merge: привязать оффер к другому каноническому событию.
   * Исходное событие помечается как дубль (canonicalOfId = target).
   */
  @Post(':id/offers/:offerId/merge')
  @Roles('ADMIN', 'EDITOR')
  async mergeOffer(
    @Param('id') sourceEventId: string,
    @Param('offerId') offerId: string,
    @Body('targetEventId') targetEventId: string,
  ) {
    if (!targetEventId) throw new NotFoundException('targetEventId обязателен');
    if (sourceEventId === targetEventId) throw new NotFoundException('Нельзя объединить событие с самим собой');

    // Проверить что target существует
    const target = await this.prisma.event.findUnique({ where: { id: targetEventId } });
    if (!target) throw new NotFoundException('Целевое событие не найдено');

    // Проверить что оффер существует
    const offer = await this.prisma.eventOffer.findFirst({
      where: { id: offerId, eventId: sourceEventId },
    });
    if (!offer) throw new NotFoundException('Оффер не найден');

    // Перенести оффер к target
    await this.prisma.eventOffer.update({
      where: { id: offerId },
      data: { eventId: targetEventId, isPrimary: false },
    });

    // Перенести сессии оффера
    await this.prisma.eventSession.updateMany({
      where: { offerId },
      data: { eventId: targetEventId },
    });

    // Если у source не осталось офферов — пометить как дубль
    const remainingOffers = await this.prisma.eventOffer.count({
      where: { eventId: sourceEventId },
    });

    if (remainingOffers === 0) {
      await this.prisma.event.update({
        where: { id: sourceEventId },
        data: { canonicalOfId: targetEventId },
      });
    }

    return { message: 'Оффер перенесён', targetEventId, remainingOffers };
  }
}
