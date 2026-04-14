import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { paginationArgs, parsePagination } from '../common/pagination';
import {
  Prisma,
  SubcategoryLayer,
  SubcategoryType,
  VenueImportSource,
  VenueLifecycleStatus,
  VenueModerationReasonCode,
  VenueSourceType,
  VenueType,
} from '@prisma/client';
import { VenueImportService } from '../catalog/venue-import.service';
import { VenueLifecycleService } from '../catalog/venue-lifecycle.service';
import { getVenueAutoModerationEnvFlags } from '../catalog/venue-auto-decision.config';
import { VenueAutoModerationService } from '../catalog/venue-auto-moderation.service';
import { VenueModerationMetricsService } from '../catalog/venue-moderation-metrics.service';
import { VenueTrustService } from '../catalog/venue-trust.service';

import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { CreateVenueDto, UpdateVenueDto, VenueAdminSummaryDto } from './dto/admin.dto';
import { VenueAdminSummaryService } from './venue-admin-summary.service';
import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';
import { SubcategoryAssignmentService } from '../subcategories/subcategory-assignment.service';
import { PublishGateService } from '../catalog/publish-gate.service';
import { buildVenueAdminListOrderBy, parseVenueListSortQuery } from './venue-admin-list-order.util';

class UpdateVenueSubcategoriesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subcategoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subcategorySlugs?: string[];
}

class AssignVenueSubcategoriesDto {
  @IsString()
  primaryCode!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryCodes?: string[];
}

class MatchVenueBodyDto {
  @IsString()
  targetVenueId!: string;

  @IsOptional()
  @IsString()
  expectedSourceUpdatedAt?: string;

  @IsOptional()
  @IsString()
  expectedTargetUpdatedAt?: string;
}

class BatchVenueIdsBodyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  ids!: string[];
}

class BatchVenueApproveItemDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  expectedUpdatedAt?: string;
}

class BatchVenueApproveBodyDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  ids?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  items?: BatchVenueApproveItemDto[];
}

class BatchRejectVenuesBodyDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  ids?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  items?: BatchVenueApproveItemDto[];

  @IsOptional()
  @IsString()
  reason?: string | null;

  @IsOptional()
  @IsEnum(VenueModerationReasonCode)
  reasonCode?: VenueModerationReasonCode | null;

  @IsOptional()
  @IsString()
  reasonText?: string | null;
}

/** Для списка админки: канонический адрес → сырой → нормализованный (читаемый fallback). */
function venueListDisplayAddress(v: {
  address: string | null;
  rawAddress: string | null;
  normalizedAddress: string | null;
}): string | null {
  const trim = (s: string | null | undefined) => {
    if (s === null || s === undefined) return null;
    const x = s.trim();
    return x.length > 0 ? x : null;
  };
  return trim(v.address) ?? trim(v.rawAddress) ?? trim(v.normalizedAddress);
}

class ApproveDraftVenueBodyDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsString()
  expectedUpdatedAt?: string;
}

class RejectVenueBodyDto {
  @IsOptional()
  @IsEnum(VenueModerationReasonCode)
  reasonCode?: VenueModerationReasonCode | null;

  @IsOptional()
  @IsString()
  reasonText?: string | null;

  @IsOptional()
  @IsString()
  expectedUpdatedAt?: string;
}

class AutoModerationDryRunBodyDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsEnum(VenueImportSource)
  importSource?: VenueImportSource;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

class AutoModerationRunBodyDto {
  @IsInt()
  @Min(1)
  @Max(500)
  limit!: number;

  @IsOptional()
  @IsEnum(VenueImportSource)
  importSource?: VenueImportSource;

  @IsOptional()
  @IsBoolean()
  onlyHighConfidence?: boolean;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/venues')
export class AdminVenuesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venueAdminSummary: VenueAdminSummaryService,
    private readonly subcategoryPolicy: SubcategoryPolicyService,
    private readonly subcategoryAssignment: SubcategoryAssignmentService,
    private readonly publishGate: PublishGateService,
    private readonly venueImport: VenueImportService,
    private readonly venueLifecycle: VenueLifecycleService,
    private readonly venueModerationMetrics: VenueModerationMetricsService,
    private readonly venueAutoModeration: VenueAutoModerationService,
    private readonly venueTrust: VenueTrustService,
  ) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async list(
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('city') city?: string,
    @Query('venueType') venueType?: string,
    @Query('search') search?: string,
    @Query('lifecycleStatus') lifecycleStatus?: string,
    @Query('importSource') importSource?: string,
    @Query('sourceType') sourceType?: string,
    @Query('needsReview') needsReview?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('includeDecisionHints') includeDecisionHints?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit: limit || '20' });
    const { sort: sortField, order: orderDir } = parseVenueListSortQuery(sort, order);
    // Cursor-pagination требует предсказуемого порядка; кастомный sort только в offset-режиме (page).
    const orderBy = pg.cursor
      ? ([{ updatedAt: 'desc' }, { id: 'desc' }] satisfies Prisma.VenueOrderByWithRelationInput[])
      : buildVenueAdminListOrderBy(sortField, orderDir);

    const where: Prisma.VenueWhereInput = {
      isDeleted: false,
      ...(city && { city: { slug: city } }),
      ...(venueType && { venueType: venueType as VenueType }),
      ...(lifecycleStatus && { lifecycleStatus: lifecycleStatus as VenueLifecycleStatus }),
      ...(importSource && { importSource: importSource as VenueImportSource }),
      ...(sourceType && { sourceType: sourceType as VenueSourceType }),
      ...(needsReview === 'true' && { needsReview: true }),
      ...(needsReview === 'false' && { needsReview: false }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { shortTitle: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        orderBy,
        ...paginationArgs(pg),
        include: {
          city: { select: { name: true, slug: true } },
          _count: { select: { events: true, offers: true } },
        },
      }),
      this.prisma.venue.count({ where }),
    ]);

    const hasMore = items.length > pg.limit;
    const pageItems = hasMore ? items.slice(0, pg.limit) : items;
    const nextCursor = hasMore && pageItems.length > 0 ? pageItems[pageItems.length - 1].id : null;

    let hints: Record<string, { decisionHint: string; decisionHintReasons: string[] }> = {};
    if (includeDecisionHints === 'true' && pageItems.length > 0) {
      const hintRows = pageItems
        .filter((v) => v.lifecycleStatus === 'DRAFT' && v.sourceType === 'IMPORTED')
        .map((v) => ({
          id: v.id,
          title: v.title,
          cityId: v.cityId,
          isDeleted: v.isDeleted,
          lifecycleStatus: v.lifecycleStatus,
          confidenceScore: v.confidenceScore,
          needsReview: v.needsReview,
          address: v.address,
          rawAddress: v.rawAddress,
        }));
      if (hintRows.length > 0) {
        hints = await this.venueLifecycle.decisionHintsForImportedDrafts(hintRows);
      }
    }

    return {
      items: pageItems.map((v) => {
        const h = hints[v.id];
        return {
          id: v.id,
          slug: v.slug,
          title: v.title,
          venueType: v.venueType,
          city: v.city,
          rating: Number(v.rating),
          isActive: v.isActive,
          isFeatured: v.isFeatured,
          lifecycleStatus: v.lifecycleStatus,
          isPublished: v.isPublished,
          sourceType: v.sourceType,
          importSource: v.importSource,
          externalVenueId: v.externalVenueId,
          needsReview: v.needsReview,
          eventsCount: v._count.events,
          offersCount: v._count.offers,
          updatedAt: v.updatedAt,
          rawName: v.rawName,
          rawAddress: v.rawAddress,
          normalizedName: v.normalizedName,
          normalizedAddress: v.normalizedAddress,
          confidenceScore: v.confidenceScore,
          mergeTargetId: v.mergeTargetId,
          version: v.version,
          displayAddress: venueListDisplayAddress(v),
          ...(h
            ? { decisionHint: h.decisionHint, decisionHintReasons: h.decisionHintReasons }
            : {}),
        };
      }),
      total,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Пакетный поиск похожих площадок для списка кандидатов (без N+1 на similar-drafts).
   * GET /admin/venues/batch/similar-drafts?ids=uuid1,uuid2&includeActive=true&limit=10
   */
  @Get('batch/similar-drafts')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async similarDraftsBatch(
    @Query('ids') ids: string,
    @Query('includeActive') includeActive?: string,
    @Query('limit') limit?: string,
  ) {
    const idList = (ids ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);
    if (idList.length === 0) {
      throw new BadRequestException({
        code: 'VENUE_SIMILAR_BATCH_IDS_REQUIRED',
        message: 'Укажите ids (uuid через запятую), не более 50',
      });
    }
    const lim = limit ? Number.parseInt(limit, 10) : 10;
    return this.venueLifecycle.findSimilarDraftsBatch(idList, {
      includeActive: includeActive !== 'false',
      limit: Number.isFinite(lim) ? lim : 10,
    });
  }

  /**
   * Пакетное подтверждение DRAFT (частичный успех в теле ответа).
   * POST /admin/venues/batch/approve
   * Body: `{ ids: string[] }` или `{ items: { id, expectedUpdatedAt? }[] }`.
   */
  @Post('batch/approve')
  @Roles('ADMIN', 'EDITOR')
  async batchApprove(
    @Body() body: BatchVenueApproveBodyDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const ids =
      body.items && body.items.length > 0
        ? body.items.map((i) => i.id)
        : body.ids && body.ids.length > 0
          ? body.ids
          : [];
    if (ids.length === 0) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Укажите ids или items' });
    }
    return this.venueLifecycle.approveBatch(ids, {
      items: body.items,
      actorAdminId: req.user?.id,
    });
  }

  /**
   * Soft-check перед batch approve (slug collisions).
   * POST /admin/venues/batch/approve-preview
   */
  @Post('batch/approve-preview')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async batchApprovePreview(@Body() body: BatchVenueIdsBodyDto) {
    return this.venueLifecycle.approveBatchPreview(body.ids);
  }

  /**
   * Агрегаты модерации площадок (решения + сигналы).
   * GET /admin/venues/moderation-metrics
   */
  @Get('moderation-metrics')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async moderationMetrics(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('importSource') importSource?: string,
  ) {
    return this.venueModerationMetrics.getMetrics({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      importSource: importSource ? (importSource as VenueImportSource) : undefined,
    });
  }

  /**
   * Разрез модерации по источникам импорта.
   * GET /admin/venues/moderation-sources
   */
  @Get('moderation-sources')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async moderationSources(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('importSource') importSource?: string,
  ) {
    return this.venueModerationMetrics.getSourcesBreakdown({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      importSource: importSource ? (importSource as VenueImportSource) : undefined,
    });
  }

  /**
   * Trust / авто-модерация по источникам импорта (Stage 5).
   * GET /admin/venues/import-source-trust
   */
  @Get('import-source-trust')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async importSourceTrust() {
    return this.venueTrust.getImportSourceTrustOverview();
  }

  /**
   * Dry-run авто-модерации (без изменений в БД).
   * POST /admin/venues/auto-moderation/dry-run
   */
  @Post('auto-moderation/dry-run')
  @Roles('ADMIN', 'EDITOR')
  async autoModerationDryRun(@Body() body: AutoModerationDryRunBodyDto) {
    return this.venueAutoModeration.runDryRun({
      from: body.from ? new Date(body.from) : undefined,
      to: body.to ? new Date(body.to) : undefined,
      importSource: body.importSource,
      limit: body.limit,
    });
  }

  /**
   * Реальный запуск авто-модерации (только при AUTO_MODERATION_ENABLED=true).
   * POST /admin/venues/auto-moderation/run
   */
  @Post('auto-moderation/run')
  @Roles('ADMIN')
  async autoModerationRun(@Body() body: AutoModerationRunBodyDto) {
    const flags = getVenueAutoModerationEnvFlags();
    if (!flags.autoModerationEnabled) {
      throw new BadRequestException({
        code: 'AUTO_MODERATION_DISABLED',
        message: 'Авто-модерация отключена (AUTO_MODERATION_ENABLED).',
      });
    }
    return this.venueAutoModeration.runAutoDecisionsForDrafts({
      limit: body.limit,
      importSource: body.importSource,
      onlyHighConfidence: body.onlyHighConfidence,
    });
  }

  /**
   * Пакетный отказ DRAFT.
   * POST /admin/venues/batch/reject
   */
  @Post('batch/reject')
  @Roles('ADMIN', 'EDITOR')
  async batchReject(
    @Body() body: BatchRejectVenuesBodyDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const ids =
      body.items && body.items.length > 0
        ? body.items.map((i) => i.id)
        : body.ids && body.ids.length > 0
          ? body.ids
          : [];
    if (ids.length === 0) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Укажите ids или items' });
    }
    return this.venueLifecycle.rejectBatch(ids, {
      reasonCode: body.reasonCode,
      reasonText: body.reasonText ?? body.reason,
      items: body.items,
      actorAdminId: req.user?.id,
    });
  }

  /**
   * Единый read-model для админки площадки: витрина, контент, связанные события.
   *
   * GET /admin/venues/:id/summary
   */
  @Get(':id/summary')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async getSummary(@Param('id') id: string): Promise<VenueAdminSummaryDto> {
    return this.venueAdminSummary.getSummary(id);
  }

  /**
   * Похожие площадки в том же городе (модерация дублей).
   * GET /admin/venues/:id/similar-drafts
   */
  @Get(':id/similar-drafts')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async similarDrafts(
    @Param('id') id: string,
    @Query('includeActive') includeActive?: string,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? Number.parseInt(limit, 10) : 10;
    return this.venueLifecycle.findSimilarDrafts(id, {
      includeActive: includeActive !== 'false',
      limit: Number.isFinite(lim) ? lim : 10,
    });
  }

  /**
   * Предпросмотр merge: кандидат vs целевая ACTIVE-площадка.
   * GET /admin/venues/:id/merge-preview?targetId=
   */
  @Get(':id/merge-preview')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async mergePreview(@Param('id') id: string, @Query('targetId') targetId?: string) {
    if (!targetId?.trim()) {
      throw new BadRequestException('Укажите query-параметр targetId');
    }
    return this.venueLifecycle.getMergePreview(id, targetId.trim());
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async get(@Param('id') id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        city: { select: { id: true, name: true, slug: true } },
        operator: { select: { id: true, name: true, slug: true } },
        events: {
          where: { isActive: true },
          orderBy: [{ isPermanent: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            slug: true,
            title: true,
            dateMode: true,
            isPermanent: true,
            endDate: true,
            priceFrom: true,
            imageUrl: true,
          },
        },
        offers: {
          where: { status: 'ACTIVE' },
          orderBy: { priority: 'desc' },
          select: {
            id: true,
            source: true,
            purchaseType: true,
            priceFrom: true,
            deeplink: true,
            badge: true,
            status: true,
          },
        },
      },
    });
    if (!venue) throw new NotFoundException('Venue not found');
    return {
      ...venue,
      rating: Number(venue.rating),
      externalRating: venue.externalRating ? Number(venue.externalRating) : null,
    };
  }

  @Get(':id/subcategories')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async getVenueSubcategories(@Param('id') id: string) {
    const venueExists = await this.prisma.venue.findUnique({ where: { id }, select: { id: true } });
    if (!venueExists) throw new NotFoundException('Venue not found');

    const links = await this.prisma.venueSubcategoryLink.findMany({
      where: { venueId: id },
      include: {
        subcategory: {
          include: {
            parent: { select: { id: true, slug: true, nameRu: true } },
          },
        },
      },
      orderBy: [{ subcategory: { sortOrder: 'asc' } }, { subcategory: { nameRu: 'asc' } }],
    });

    const primarySubcategory =
      links.find((l) => l.subcategory.layer === SubcategoryLayer.PRIMARY)?.subcategory ?? null;
    const secondarySubcategories = links
      .filter((l) => l.subcategory.layer === SubcategoryLayer.SECONDARY)
      .map((l) => l.subcategory);

    return {
      primarySubcategory,
      secondarySubcategories,
      all: links.map((l) => l.subcategory),
    };
  }

  @Post(':id/subcategories')
  @Roles('ADMIN', 'EDITOR')
  async assignVenueSubcategoriesPost(@Param('id') id: string, @Body() dto: AssignVenueSubcategoriesDto) {
    const venueExists = await this.prisma.venue.findUnique({ where: { id }, select: { id: true } });
    if (!venueExists) throw new NotFoundException('Venue not found');

    await this.prisma.$transaction((tx) =>
      this.subcategoryAssignment.assignVenueSubcategories(id, dto.primaryCode, dto.secondaryCodes ?? [], tx),
    );

    return this.getVenueSubcategories(id);
  }

  /**
   * @deprecated Используйте POST .../subcategories с primaryCode + secondaryCodes.
   */
  @Patch(':id/subcategories')
  @Roles('ADMIN', 'EDITOR')
  async setVenueSubcategories(@Param('id') id: string, @Body() body: UpdateVenueSubcategoriesDto) {
    const venueExists = await this.prisma.venue.findUnique({ where: { id }, select: { id: true } });
    if (!venueExists) throw new NotFoundException('Venue not found');

    const idsById = Array.from(new Set(body.subcategoryIds ?? []));
    const idsBySlug = Array.from(new Set(body.subcategorySlugs ?? []));
    if (!idsById.length && !idsBySlug.length) {
      throw new BadRequestException('subcategoryIds or subcategorySlugs required');
    }

    const rows = await this.prisma.subcategory.findMany({
      where: {
        isActive: true,
        type: { in: [SubcategoryType.UNIVERSAL, SubcategoryType.VENUE_ONLY] },
        OR: [{ id: { in: idsById } }, { slug: { in: idsBySlug } }],
      },
      select: { id: true, slug: true },
    });

    const requestedCount = new Set([...idsById, ...idsBySlug]).size;
    if (rows.length !== requestedCount) {
      throw new BadRequestException('Some subcategories are invalid for Venue or inactive');
    }
    this.subcategoryPolicy.assertVenueLimit(rows.length);

    await this.prisma.$transaction(async (tx) => {
      await tx.venueSubcategoryLink.deleteMany({ where: { venueId: id } });
      if (rows.length) {
        await tx.venueSubcategoryLink.createMany({
          data: rows.map((r) => ({ venueId: id, subcategoryId: r.id })),
          skipDuplicates: true,
        });
      }
    });

    return this.getVenueSubcategories(id);
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() body: CreateVenueDto, @Req() req: Request & { user?: { id: string } }) {
    if (!body.title || !body.cityId || !body.venueType) {
      throw new BadRequestException('title, cityId, venueType required');
    }

    // Auto-generate slug
    const slug = body.slug || this.generateSlug(body.title);

    const existing = await this.prisma.venue.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Slug "${slug}" already exists`);

    // Validate minimum fields for publish
    const wantsActive = body.isActive ?? true;
    if (wantsActive) {
      this.validateForPublish(body);
    }

    const venue = await this.prisma.venue.create({
      data: {
        slug,
        title: body.title,
        shortTitle: body.shortTitle || null,
        venueType: body.venueType,
        cityId: body.cityId,
        description: body.description || null,
        shortDescription: body.shortDescription || null,
        imageUrl: body.imageUrl || null,
        galleryUrls: body.galleryUrls || [],
        address: body.address || null,
        lat: body.lat ? Number(body.lat) : null,
        lng: body.lng ? Number(body.lng) : null,
        metro: body.metro || null,
        district: body.district || null,
        phone: body.phone || null,
        email: body.email || null,
        website: body.website || null,
        openingHours: (body.openingHours ?? undefined) as Prisma.InputJsonValue | undefined,
        priceFrom: body.priceFrom ? Number(body.priceFrom) : null,
        operatorId: body.operatorId || null,
        isActive: wantsActive,
        isFeatured: body.isFeatured ?? false,
        metaTitle: body.metaTitle || null,
        metaDescription: body.metaDescription || null,
        createdByType: 'ADMIN',
        createdById: req.user?.id ?? null,
        externalRating: body.externalRating ? Number(body.externalRating) : null,
        externalSource: body.externalSource || null,
        highlights: (body.highlights ?? undefined) as Prisma.InputJsonValue | undefined,
        faq: (body.faq ?? undefined) as Prisma.InputJsonValue | undefined,
        features: body.features || [],
        commissionRate: body.commissionRate ? Number(body.commissionRate) : null,
        lifecycleStatus: 'ACTIVE',
        isPublished: (body as { isPublished?: boolean }).isPublished !== false,
        sourceType: 'MANUAL',
        normalizedName: VenueImportService.normalizeText(body.title),
        normalizedAddress: body.address ? VenueImportService.normalizeText(body.address) : null,
      },
    });

    return venue;
  }

  @Post(':id/merge-into')
  @Roles('ADMIN', 'EDITOR')
  async mergeInto(
    @Param('id') id: string,
    @Body() body: MatchVenueBodyDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.venueLifecycle.mergeInto(id, body.targetVenueId, {
      actorAdminId: req.user?.id,
      expectedSourceUpdatedAt: body.expectedSourceUpdatedAt,
      expectedTargetUpdatedAt: body.expectedTargetUpdatedAt,
    });
  }

  @Post(':id/approve-draft')
  @Roles('ADMIN', 'EDITOR')
  async approveDraft(
    @Param('id') id: string,
    @Body() body: ApproveDraftVenueBodyDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.venueLifecycle.approveDraft(
      id,
      {
        title: body.title,
        address: body.address,
        slug: body.slug,
        isPublished: body.isPublished,
      },
      { actorAdminId: req.user?.id, expectedUpdatedAt: body.expectedUpdatedAt },
    );
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'EDITOR')
  async rejectImported(
    @Param('id') id: string,
    @Body() body: RejectVenueBodyDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.venueLifecycle.rejectVenue(id, {
      actorAdminId: req.user?.id,
      expectedUpdatedAt: body.expectedUpdatedAt,
      reasonCode: body.reasonCode ?? null,
      reasonText: body.reasonText ?? null,
    });
  }

  @Post(':id/venue-page-published')
  @Roles('ADMIN', 'EDITOR')
  async setVenuePagePublished(@Param('id') id: string, @Body() body: { published: boolean }) {
    if (typeof body?.published !== 'boolean') throw new BadRequestException('published boolean required');
    return this.venueLifecycle.setVenuePagePublished(id, body.published);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() body: UpdateVenueDto) {
    const version = body.version;
    if (version === undefined) throw new BadRequestException('version required for update');

    const existing = await this.prisma.venue.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Venue not found');

    if (body.isActive === true) {
      const merged = {
        title: body.title ?? existing.title,
        address: body.address ?? existing.address,
        imageUrl: body.imageUrl ?? existing.imageUrl,
        priceFrom: body.priceFrom ?? existing.priceFrom,
        galleryUrls: body.galleryUrls ?? existing.galleryUrls,
        description: body.description ?? existing.description,
      };
      this.validateForPublish(merged);
      const gate = await this.publishGate.validateVenueForPublish(id);
      if (gate.result === 'BLOCKING') {
        const msg = gate.checks
          .filter((c) => c.status === 'BLOCKING')
          .map((c) => c.message)
          .join('; ');
        throw new BadRequestException(msg || 'Площадка не проходит проверки публикации');
      }
    }

    const result = await this.prisma.venue.updateMany({
      where: { id, version: Number(version) },
      data: {
        ...(body.title !== undefined && {
          title: body.title,
          normalizedName: VenueImportService.normalizeText(body.title),
        }),
        ...(body.shortTitle !== undefined && { shortTitle: body.shortTitle || null }),
        ...(body.venueType !== undefined && { venueType: body.venueType }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.shortDescription !== undefined && { shortDescription: body.shortDescription || null }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
        ...(body.galleryUrls !== undefined && { galleryUrls: body.galleryUrls }),
        ...(body.address !== undefined && {
          address: body.address || null,
          normalizedAddress: body.address?.trim() ? VenueImportService.normalizeText(body.address) : null,
        }),
        ...(body.lat !== undefined && { lat: body.lat ? Number(body.lat) : null }),
        ...(body.lng !== undefined && { lng: body.lng ? Number(body.lng) : null }),
        ...(body.metro !== undefined && { metro: body.metro || null }),
        ...(body.district !== undefined && { district: body.district || null }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.website !== undefined && { website: body.website || null }),
        ...(body.openingHours !== undefined && { openingHours: body.openingHours }),
        ...(body.priceFrom !== undefined && { priceFrom: body.priceFrom ? Number(body.priceFrom) : null }),
        ...(body.operatorId !== undefined && { operatorId: body.operatorId || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
        ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle || null }),
        ...(body.metaDescription !== undefined && { metaDescription: body.metaDescription || null }),
        ...(body.externalRating !== undefined && {
          externalRating: body.externalRating ? Number(body.externalRating) : null,
        }),
        ...(body.externalSource !== undefined && { externalSource: body.externalSource || null }),
        ...(body.highlights !== undefined && { highlights: body.highlights }),
        ...(body.faq !== undefined && { faq: body.faq }),
        ...(body.features !== undefined && { features: body.features }),
        ...(body.commissionRate !== undefined && {
          commissionRate: body.commissionRate ? Number(body.commissionRate) : null,
        }),
        ...(body.refundPolicyMode !== undefined && { refundPolicyMode: body.refundPolicyMode }),
        ...(body.refundPolicyText !== undefined && { refundPolicyText: body.refundPolicyText || null }),
        ...(body.venueTemplateData !== undefined && { venueTemplateData: body.venueTemplateData }),
        version: { increment: 1 },
      } as Parameters<typeof this.prisma.venue.updateMany>[0]['data'],
    });

    if (result.count === 0) {
      throw new ConflictException('Данные были изменены другим пользователем. Обновите страницу.');
    }

    return this.prisma.venue.findUnique({ where: { id } });
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new NotFoundException('Venue not found');

    await this.prisma.venue.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), isActive: false },
    });

    return { success: true };
  }

  /**
   * Validate minimum required fields for venue publication.
   * Rule: venue cannot be active without these fields filled.
   * Required: title, address, imageUrl, priceFrom, description (at least short).
   */
  private validateForPublish(data: { title?: string; address?: string | null; imageUrl?: string | null; priceFrom?: number | null; description?: string | null; shortDescription?: string | null; galleryUrls?: unknown[] }): void {
    const errors: string[] = [];

    if (!data.title?.trim()) errors.push('Название (title)');
    if (!data.address?.trim()) errors.push('Адрес (address)');
    if (!data.imageUrl?.trim()) errors.push('Основное фото (imageUrl)');
    if (!data.priceFrom || Number(data.priceFrom) <= 0) errors.push('Цена от (priceFrom)');
    if (!data.description?.trim() && !data.shortDescription?.trim()) errors.push('Описание (description)');

    const galleryCount = (data.galleryUrls || []).length;
    const totalPhotos = (data.imageUrl ? 1 : 0) + galleryCount;
    if (totalPhotos < 3) {
      // Soft warning — не блокируем, но логируем
      // В будущем можно сделать строгим
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Для публикации заполните обязательные поля: ${errors.join(', ')}`);
    }
  }

  private generateSlug(title: string): string {
    const translitMap: Record<string, string> = {
      а: 'a',
      б: 'b',
      в: 'v',
      г: 'g',
      д: 'd',
      е: 'e',
      ё: 'yo',
      ж: 'zh',
      з: 'z',
      и: 'i',
      й: 'j',
      к: 'k',
      л: 'l',
      м: 'm',
      н: 'n',
      о: 'o',
      п: 'p',
      р: 'r',
      с: 's',
      т: 't',
      у: 'u',
      ф: 'f',
      х: 'kh',
      ц: 'ts',
      ч: 'ch',
      ш: 'sh',
      щ: 'shch',
      ъ: '',
      ы: 'y',
      ь: '',
      э: 'e',
      ю: 'yu',
      я: 'ya',
    };
    return title
      .toLowerCase()
      .split('')
      .map((c) => translitMap[c] ?? c)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80);
  }
}
