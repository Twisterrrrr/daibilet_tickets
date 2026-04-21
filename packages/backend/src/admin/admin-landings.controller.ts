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
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LandingStatus, LandingTemplateType } from '@/prisma-client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { toJsonValue } from '../common/typing';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { LandingMaterializerService } from '../landing/landing-materializer.service';
import { LandingSeoAuditService } from '../landing/landing-seo-audit.service';
import { LandingService } from '../landing/landing.service';
import {
  CreateLandingContentBlockDto,
  CreateLandingDto,
  ReorderLandingContentBlocksDto,
  UpdateLandingContentBlockDto,
  UpdateLandingDto,
} from './dto/admin.dto';
import { AdminContentWriteValidationService } from './admin-content-write-validation.service';
import {
  AdditionalFiltersSchema,
  SeasonalPayloadSchema,
  FaqSchema,
  HowToChooseSchema,
  InfoBlockSchema,
  RelatedLinkSchema,
  ReviewSchema,
  StatsSchema,
  validateJson,
} from './json-schemas';
import { buildLandingHubReadinessSnapshot } from './hub-readiness/hub-readiness-snapshot.util';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/landings')
export class AdminLandingsController {
  private readonly publicSiteBase = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') ?? null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly writeValidation: AdminContentWriteValidationService,
    private readonly materializer: LandingMaterializerService,
    private readonly landings: LandingService,
    private readonly landingSeoAudit: LandingSeoAuditService,
  ) {}

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('status') status?: LandingStatus,
    @Query('templateType') templateType?: LandingTemplateType,
    @Query('showInCollections') showInCollections?: string,
    @Query('landingType') landingType?: 'CITY' | 'MULTI_CITY',
    @Query('eventSourceType') eventSourceType?: 'AUTO_QUERY' | 'PRIMARY_COLLECTION' | 'MIXED',
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const where: Record<string, unknown> = { isDeleted: false };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city) where.city = { slug: city };
    if (status) where.status = status;
    if (templateType) where.templateType = templateType;
    if (showInCollections === 'true') where.showInCollections = true;
    if (showInCollections === 'false') where.showInCollections = false;
    if (landingType) where.landingType = landingType;
    if (eventSourceType) where.eventSourceType = eventSourceType;

    const pg = parsePagination({ cursor, page, limit });
    const [rawItems, total] = await Promise.all([
      this.prisma.landingPage.findMany({
        where,
        include: {
          city: { select: { slug: true, name: true } },
          parentLanding: { select: { id: true, slug: true, title: true, landingType: true } },
          filterTagRef: { select: { id: true, slug: true, name: true, isActive: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        ...paginationArgs(pg),
      }),
      this.prisma.landingPage.count({ where }),
    ]);
    return buildPaginatedResult(rawItems, total, pg.limit);
  }

  @Get(':id/resolved-events')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async getResolvedEvents(@Param('id') id: string) {
    return this.landings.resolveAdminResolvedEvents(id);
  }

  @Post(':id/blocks/reorder')
  @Roles('ADMIN', 'EDITOR')
  async reorderBlocks(@Param('id') landingId: string, @Body() body: ReorderLandingContentBlocksDto) {
    const landing = await this.prisma.landingPage.findFirst({ where: { id: landingId, isDeleted: false } });
    if (!landing) throw new NotFoundException('Лендинг не найден');

    const [matching, totalBlocks] = await Promise.all([
      this.prisma.landingContentBlock.count({
        where: { landingPageId: landingId, id: { in: body.orderedIds } },
      }),
      this.prisma.landingContentBlock.count({ where: { landingPageId: landingId } }),
    ]);
    if (matching !== body.orderedIds.length || totalBlocks !== body.orderedIds.length) {
      throw new BadRequestException({
        code: 'BLOCK_REORDER_INVALID',
        message: 'Список id должен содержать все блоки лендинга ровно один раз',
      });
    }

    await this.prisma.$transaction(
      body.orderedIds.map((blockId, index) =>
        this.prisma.landingContentBlock.updateMany({
          where: { id: blockId, landingPageId: landingId },
          data: { sortOrder: index },
        }),
      ),
    );
    return { success: true };
  }

  @Post(':id/blocks')
  @Roles('ADMIN', 'EDITOR')
  async createBlock(@Param('id') landingId: string, @Body() dto: CreateLandingContentBlockDto) {
    const landing = await this.prisma.landingPage.findFirst({ where: { id: landingId, isDeleted: false } });
    if (!landing) throw new NotFoundException('Лендинг не найден');

    const maxSort = await this.prisma.landingContentBlock.aggregate({
      where: { landingPageId: landingId },
      _max: { sortOrder: true },
    });
    const nextOrder = dto.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1;

    return this.prisma.landingContentBlock.create({
      data: {
        landingPageId: landingId,
        type: dto.type,
        variant: dto.variant ?? null,
        title: dto.title ?? null,
        subtitle: dto.subtitle ?? null,
        eyebrow: dto.eyebrow ?? null,
        body: dto.body ?? null,
        richTextJson: dto.richTextJson != null ? toJsonValue(dto.richTextJson) : undefined,
        payload: dto.payload != null ? toJsonValue(dto.payload) : undefined,
        assetUrl: dto.assetUrl ?? null,
        mobileAssetUrl: dto.mobileAssetUrl ?? null,
        isEnabled: dto.isEnabled ?? true,
        sortOrder: nextOrder,
        visibilityRules: dto.visibilityRules != null ? toJsonValue(dto.visibilityRules) : undefined,
      },
    });
  }

  @Patch(':id/blocks/:blockId')
  @Roles('ADMIN', 'EDITOR')
  async updateBlock(
    @Param('id') landingId: string,
    @Param('blockId') blockId: string,
    @Body() dto: UpdateLandingContentBlockDto,
  ) {
    const found = await this.prisma.landingContentBlock.findFirst({
      where: { id: blockId, landingPageId: landingId },
    });
    if (!found) throw new NotFoundException('Блок не найден');

    const data: Record<string, unknown> = { ...dto };
    if (dto.richTextJson !== undefined) data.richTextJson = dto.richTextJson != null ? toJsonValue(dto.richTextJson) : null;
    if (dto.payload !== undefined) data.payload = dto.payload != null ? toJsonValue(dto.payload) : null;
    if (dto.visibilityRules !== undefined) data.visibilityRules = dto.visibilityRules != null ? toJsonValue(dto.visibilityRules) : null;

    return this.prisma.landingContentBlock.update({
      where: { id: blockId },
      data: data as never,
    });
  }

  @Delete(':id/blocks/:blockId')
  @Roles('ADMIN', 'EDITOR')
  async deleteBlock(@Param('id') landingId: string, @Param('blockId') blockId: string) {
    const found = await this.prisma.landingContentBlock.findFirst({
      where: { id: blockId, landingPageId: landingId },
    });
    if (!found) throw new NotFoundException('Блок не найден');

    await this.prisma.landingContentBlock.delete({ where: { id: blockId } });
    return { success: true };
  }

  @Get(':id/seo-audit')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async getSeoAudit(@Param('id') id: string) {
    const resolved = await this.landings.resolveAdminResolvedEvents(id);
    const audit = await this.landingSeoAudit.auditLandingPage(id, resolved.total);
    return {
      ...audit,
      matchedEventsCount: resolved.total,
      domains: {
        metadata: ['NO_SEO_TITLE', 'NO_SEO_DESCRIPTION', 'TITLE_TOO_LONG', 'DESCRIPTION_TOO_LONG', 'MISSING_OG_IMAGE'],
        canonicalIndexability: ['CANONICAL_MISSING', 'CANONICAL_CONFLICT', 'INDEXABLE_WITH_THIN_CONTENT'],
        sourceCompleteness: ['NO_MATCHED_EVENTS', 'LOW_EVENT_COUNT'],
        contentCompleteness: ['NO_HERO', 'NO_VISIBLE_BLOCKS', 'NO_FAQ', 'NO_SEO_TEXT'],
        intentCollision: ['CITY_MULTI_CITY_INTENT_COLLISION'],
        relatedLinks: ['BROKEN_RELATED_LINK'],
      },
    };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const landing = await this.prisma.landingPage.findUniqueOrThrow({
      where: { id },
      include: {
        city: { select: { slug: true, name: true } },
        theme: { select: { id: true, slug: true, name: true, isActive: true } },
        parentLanding: { select: { id: true, slug: true, title: true, landingType: true } },
        filterTagRef: { select: { id: true, slug: true, name: true, isActive: true } },
        contentBlocks: { orderBy: { sortOrder: 'asc' } },
        childLandings: {
          where: { isDeleted: false },
          include: { city: { select: { slug: true, name: true } } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          take: 100,
        },
      },
    });

    const resolved = await this.landings.resolveAdminResolvedEvents(id);
    const hubReadiness = buildLandingHubReadinessSnapshot({
      landingId: landing.id,
      slug: landing.slug,
      title: landing.title,
      landingType: landing.landingType,
      status: landing.status,
      isDeleted: landing.isDeleted,
      isActive: landing.isActive,
      isIndexable: landing.isIndexable,
      cityId: landing.cityId,
      parentLandingId: landing.parentLandingId,
      metaTitle: landing.metaTitle,
      metaDescription: landing.metaDescription,
      heroText: landing.heroText,
      subtitle: landing.subtitle,
      collectionId: landing.collectionId,
      relatedArticleIds: landing.relatedArticleIds,
      relatedCollectionIds: landing.relatedCollectionIds,
      resolvedEventsTotal: resolved.total,
      childLandingsCount: landing.childLandings.length,
      citySlug: landing.city?.slug ?? null,
      canonicalUrl: landing.canonicalUrl,
      siteBaseUrl: this.publicSiteBase,
    });

    return { ...landing, hubReadiness };
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() data: CreateLandingDto) {
    // Для publish-guard’ов нужен id; в create пока запрещаем сразу активировать MULTI_CITY без child’ов.
    await this.validateLandingRules(data as unknown as Record<string, unknown>);
    this.validateJsonFields(data as unknown as Record<string, unknown>);

    // filterTag validation + dual-write bridge (slug <-> id)
    const resolved = await this.writeValidation.validateLandingFilterTag(data as unknown as { filterTagId?: unknown; filterTag?: unknown }, 'admin.landings.create.filterTag');
    if (resolved.filterTagId) (data as unknown as Record<string, unknown>).filterTagId = resolved.filterTagId;
    if (resolved.filterTag) (data as unknown as Record<string, unknown>).filterTag = resolved.filterTag;

    const prismaData = {
      ...data,
      additionalFilters: data.additionalFilters ? toJsonValue(data.additionalFilters) : undefined,
      rankingJson: data.rankingJson ? toJsonValue(data.rankingJson) : undefined,
      seasonalPayload: data.seasonalPayload ? toJsonValue(data.seasonalPayload) : undefined,
      queryConfig: data.queryConfig ? toJsonValue(data.queryConfig) : undefined,
      status: data.status ?? (data.isActive ? LandingStatus.ACTIVE : LandingStatus.DRAFT),
    };
    return this.prisma.landingPage.create({ data: prismaData as never });
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdateLandingDto, @Request() req: { user: { id: string } }) {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, city: _city, version: _version, ...clean } = data as Record<string, unknown>;

    this.validateJsonFields(clean);

    if (clean.filterTagId !== undefined || clean.filterTag !== undefined) {
      const resolved = await this.writeValidation.validateLandingFilterTag(clean as { filterTagId?: unknown; filterTag?: unknown }, 'admin.landings.update.filterTag');
      clean.filterTagId = resolved.filterTagId;
      clean.filterTag = resolved.filterTag;
    }

    const beforeForRules = await this.prisma.landingPage.findUnique({ where: { id }, include: { city: { select: { id: true } } } });
    if (!beforeForRules) throw new BadRequestException('Landing not found');
    await this.validateLandingRules(
      { id, ...(beforeForRules as unknown as Record<string, unknown>), ...(data as unknown as Record<string, unknown>) },
      id,
    );

    if (data.version !== undefined) {
      const before = await this.prisma.landingPage.findUnique({ where: { id } });

      const [result] = await this.prisma.$transaction([
        this.prisma.landingPage.updateMany({
          where: { id, version: data.version },
          data: {
            ...clean,
            ...(clean.rankingJson !== undefined ? { rankingJson: toJsonValue(clean.rankingJson) } : {}),
            ...(clean.additionalFilters !== undefined ? { additionalFilters: toJsonValue(clean.additionalFilters) } : {}),
            ...(clean.seasonalPayload !== undefined ? { seasonalPayload: toJsonValue(clean.seasonalPayload) } : {}),
            ...(clean.queryConfig !== undefined ? { queryConfig: toJsonValue(clean.queryConfig) } : {}),
            version: { increment: 1 },
          },
        }),
      ]);

      if (result.count === 0) {
        throw new ConflictException('Данные были изменены другим пользователем');
      }

      const after = await this.prisma.landingPage.findUnique({ where: { id } });
      await this.audit.log(req.user.id, 'UPDATE', 'LandingPage', id, before ?? undefined, after ?? undefined);
      return after;
    }

    return this.prisma.landingPage.update({ where: { id }, data: clean });
  }

  @Post('materialize')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Materialize: обновить isActive лендингов по порогу событий' })
  async materialize() {
    return this.materializer.materialize();
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.prisma.landingPage.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { success: true };
  }

  @Post(':id/analytics/:event')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async trackAnalytics(
    @Param('id') id: string,
    @Param('event') event: 'landing_impression' | 'landing_click' | 'landing_conversion',
    @Request() req: { user?: { id?: string } },
  ) {
    if (!['landing_impression', 'landing_click', 'landing_conversion'].includes(event)) {
      throw new BadRequestException('Unsupported analytics event');
    }
    await this.audit.log(
      req.user?.id ?? 'system',
      'UPDATE',
      'LandingAnalytics',
      id,
      null,
      { event, at: new Date().toISOString() },
    );
    return { success: true };
  }

  @Get('analytics/summary')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async getAnalytics(@Query('city') city?: string) {
    const where: Parameters<AuditService['findMany']>[0] = { entity: 'LandingAnalytics', page: 1, limit: 5000 };
    const { items } = await this.audit.findMany(where);
    const grouped = new Map<
      string,
      { landingId: string; impressions: number; clicks: number; conversions: number; ctr: number; conversionRate: number; priorityScore: number }
    >();
    for (const item of items) {
      const key = item.entityId;
      const after = (item.after as { event?: string } | null) ?? null;
      if (!after?.event) continue;
      const prev = grouped.get(key) ?? {
        landingId: key,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        conversionRate: 0,
        priorityScore: 0,
      };
      if (after.event === 'landing_impression') prev.impressions += 1;
      if (after.event === 'landing_click') prev.clicks += 1;
      if (after.event === 'landing_conversion') prev.conversions += 1;
      grouped.set(key, prev);
    }

    const landingIds = [...grouped.keys()];
    const landings = landingIds.length
      ? await this.prisma.landingPage.findMany({
          where: { id: { in: landingIds }, ...(city ? { city: { slug: city } } : {}) },
          include: { city: { select: { slug: true, name: true } } },
        })
      : [];
    const landingMap = new Map(landings.map((landing) => [landing.id, landing]));
    const rows = [...grouped.values()]
      .filter((row) => landingMap.has(row.landingId))
      .map((row) => {
        const ctr = row.impressions > 0 ? row.clicks / row.impressions : 0;
        const conversionRate = row.clicks > 0 ? row.conversions / row.clicks : 0;
        const manualBoost = 1;
        const priorityScore = ctr * conversionRate * manualBoost;
        const landing = landingMap.get(row.landingId)!;
        return {
          ...row,
          title: landing.title,
          slug: landing.slug,
          city: landing.city,
          ctr,
          conversionRate,
          priorityScore,
          bucket: Math.abs(this.hash(landing.id)) % 2 === 0 ? 'A' : 'B',
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
    return { items: rows };
  }

  private hash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) hash = (hash << 5) - hash + input.charCodeAt(i);
    return hash;
  }

  private validateJsonFields(data: Record<string, unknown>) {
    try {
      if (data.faq !== undefined) validateJson(FaqSchema, data.faq, 'faq');
      if (data.reviews !== undefined) validateJson(ReviewSchema, data.reviews, 'reviews');
      if (data.stats !== undefined) validateJson(StatsSchema, data.stats, 'stats');
      if (data.relatedLinks !== undefined) validateJson(RelatedLinkSchema, data.relatedLinks, 'relatedLinks');
      if (data.howToChoose !== undefined) validateJson(HowToChooseSchema, data.howToChoose, 'howToChoose');
      if (data.infoBlocks !== undefined) validateJson(InfoBlockSchema, data.infoBlocks, 'infoBlocks');
      if (data.additionalFilters !== undefined)
        validateJson(AdditionalFiltersSchema, data.additionalFilters, 'additionalFilters');
      if (data.seasonalPayload !== undefined && data.seasonalPayload !== null)
        validateJson(SeasonalPayloadSchema, data.seasonalPayload, 'seasonalPayload');
    } catch (e: unknown) {
      throw new BadRequestException(e instanceof Error ? e.message : String(e));
    }
  }

  private async validateLandingRules(raw: Record<string, unknown>, selfId?: string) {
    const landingType = (raw.landingType as string | undefined) ?? 'CITY';
    const cityId = (raw.cityId as string | null | undefined) ?? null;
    const parentLandingId = (raw.parentLandingId as string | null | undefined) ?? null;
    const slug = (raw.slug as string | undefined) ?? '';
    const status = (raw.status as LandingStatus | undefined) ?? undefined;
    const isActive = raw.isActive === undefined ? undefined : Boolean(raw.isActive);

    if (!slug) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'slug обязателен' });

    if (landingType === 'CITY') {
      if (!cityId) throw new BadRequestException({ code: 'LANDING_CITY_REQUIRED', message: 'CITY лендинг: cityId обязателен' });
      if (parentLandingId) {
        const parent = await this.prisma.landingPage.findUnique({ where: { id: parentLandingId } });
        if (!parent || parent.isDeleted) {
          throw new BadRequestException({ code: 'INVALID_PARENT_LANDING', message: 'Родительский лендинг не найден' });
        }
        if (parent.landingType !== 'MULTI_CITY') {
          throw new BadRequestException({
            code: 'LANDING_PARENT_TYPE_INVALID',
            message: 'Родитель должен быть MULTI_CITY',
          });
        }
      }

      // Publish/activate guard: CITY нельзя активировать/публиковать, если выдача пуста.
      const wantsActive = status === LandingStatus.ACTIVE || isActive === true;
      if (wantsActive) {
        const preview = await this.landings.resolveAdminResolvedEvents(selfId ?? String(raw.id ?? ''));
        if ((preview.total ?? 0) <= 0) {
          throw new ConflictException({
            code: 'LANDING_PUBLISH_EMPTY_RESULTS',
            message: 'Нельзя активировать CITY лендинг без выдачи событий',
          });
        }
      }
    } else if (landingType === 'MULTI_CITY') {
      if (cityId) {
        throw new BadRequestException({ code: 'LANDING_CITY_FORBIDDEN', message: `${landingType} лендинг: cityId запрещён` });
      }
      if (parentLandingId) {
        throw new BadRequestException({
          code: 'LANDING_PARENT_TYPE_INVALID',
          message: `${landingType} лендинг: parentLandingId запрещён`,
        });
      }

      const conflict = await this.prisma.landingPage.findFirst({
        where: {
          isDeleted: false,
          slug,
          landingType: 'MULTI_CITY',
          ...(selfId ? { id: { not: selfId } } : {}),
        },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException({ code: 'LANDING_SLUG_CONFLICT', message: 'Slug уже занят (MULTI_CITY)' });
      }

      // Publish/activate guard: MULTI_CITY нельзя активировать/публиковать без живых child-вариантов.
      const wantsActive = status === LandingStatus.ACTIVE || isActive === true;
      if (wantsActive) {
        const landingId = selfId ?? String(raw.id ?? '');
        if (!landingId || landingId === 'undefined') return;
        const liveChildren = await this.prisma.landingPage.count({
          where: {
            parentLandingId: landingId,
            isDeleted: false,
            landingType: 'CITY',
            status: LandingStatus.ACTIVE,
            isActive: true,
            isIndexable: true,
          },
        });
        if (liveChildren <= 0) {
          throw new ConflictException({
            code: 'LANDING_PUBLISH_EMPTY_RESULTS',
            message: 'Нельзя активировать MULTI_CITY без живых городских вариантов',
          });
        }
      }
    } else {
      throw new BadRequestException({ code: 'INVALID_LANDING_TYPE', message: 'Некорректный landingType' });
    }
  }
}
