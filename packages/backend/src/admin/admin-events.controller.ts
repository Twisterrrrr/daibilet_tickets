import { ensurePayloadVersion, normalizeEventTitle, validateWidgetPayload } from '@daibilet/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  Res,
  UseGuards,
  UseInterceptors,
  ConflictException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  DateMode,
  EventAudience,
  EventCategory,
  EventSource,
  EventSubcategory,
  OfferSource,
  OfferStatus,
  Prisma,
  PurchaseType,
  TagKind,
  EventTagAssignmentSource,
  SubcategoryLayer,
  SubcategoryType,
} from '@/prisma-client';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CacheInvalidationService } from '../cache/cache-invalidation.service';
import { FuzzyDedupService } from '../catalog/fuzzy-dedup.service';
import { ReviewService } from '../catalog/review.service';
import { streamCsv } from '../common/csv-stream.util';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { ProviderRegistryService } from '../integrations/routing/provider-registry.service';
import { ProviderRoutingService } from '../integrations/routing/provider-routing.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  AdminCreateSessionDto,
  AdminEventSessionsRangeDto,
  AdminSessionsBulkDto,
  AdminSessionsBulkResponseDto,
  AdminSessionsOverviewDto,
  AdminStopSessionDto,
  AdminUpdateSessionDto,
  AdminCancelSessionDto,
  BatchCreateEventSessionsDto,
  CreateEventDto,
  CreateEventOfferDto,
  EventActivationDto,
  UpdateEventSlugDto,
  EventQualityDto,
  EventAdminSummaryDto,
  ExternalRatingDto,
  OverrideEventDto,
  PatchEventMediaDto,
  PatchEventOfferDto,
  UpdateEventOfferDto,
  VenueSettingsDto,
  BulkUpdateEventsDto,
  EventLandingTableFacetsDto,
  EventCateringDto,
} from './dto/admin.dto';
import { EventOverrideService } from './event-override.service';
import { EventAdminSummaryService } from './event-admin-summary.service';
import { EventQualityIssue, EventQualityService } from '../catalog/event-quality.service';
import { PublishGateService } from '../catalog/publish-gate.service';
import { AuditService } from './audit.service';
import { toJsonValue } from '../common/typing';
import { EventTagRulesService } from './event-tag-rules.service';
import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';
import { SubcategoryAssignmentService } from '../subcategories/subcategory-assignment.service';
import { CatalogClassificationNormalizerService } from '../catalog/catalog-classification-normalizer.service';
import { deriveSectionsFromSubcategories, getSubcategorySlugsForSection } from '../catalog-classification/derive-sections';
import type { SectionSlug } from '../catalog-classification/classification.types';
import {
  computeAdminEventQuickHealth,
  isImportedArchived,
  mapEventOfferToCategoryPriceDto,
  readinessFromIssueCodes,
  readinessScoreFromQuickHealth,
} from './event-admin-list-health.util';

function parseBool(v: string | undefined): boolean {
  return v === '1' || v === 'true' || v === 'yes';
}

function parseIdsParam(raw: string | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  );
}

class UpdateEventTagsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  structuralTags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  popularTags?: string[];
}

class UpdateEventSubcategoriesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subcategoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subcategorySlugs?: string[];
}

/** Назначение PRIMARY + SECONDARY по code (источник истины — link-таблица). */
class AssignEventSubcategoriesDto {
  @IsString()
  primaryCode!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryCodes?: string[];
}

class BatchArchiveImportedEventsDto {
  @IsBoolean()
  dryRun!: boolean;

  @IsString()
  source!: 'TICKETSCLOUD' | 'TEPLOHOD';

  @IsInt()
  @Min(1)
  @Max(3650)
  olderThanDays!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  take?: number;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/events')
export class AdminEventsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly overrideService: EventOverrideService,
    private readonly eventTagRules: EventTagRulesService,
    private readonly reviewService: ReviewService,
    private readonly fuzzyDedupService: FuzzyDedupService,
    private readonly cacheInvalidation: CacheInvalidationService,
    private readonly eventQuality: EventQualityService,
    private readonly publishGate: PublishGateService,
    private readonly eventAdminSummary: EventAdminSummaryService,
    private readonly audit: AuditService,
    private readonly subcategoryPolicy: SubcategoryPolicyService,
    private readonly subcategoryAssignment: SubcategoryAssignmentService,
    private readonly catalogClassificationNormalizer: CatalogClassificationNormalizerService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly providerRouting: ProviderRoutingService,
  ) {}

  @Get('health/batch')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async batchHealth(@Query('ids') idsRaw?: string) {
    const ids = parseIdsParam(idsRaw).slice(0, 200);
    if (ids.length === 0) {
      return { items: [] as Array<{ id: string; flags: Record<string, boolean>; issueCodes: string[] }> };
    }

    const now = new Date();

    const [events, futureSessions, pricedOffers, linkCounts] = await Promise.all([
      this.prisma.event.findMany({
        where: { id: { in: ids }, isDeleted: false },
        select: {
          id: true,
          imageUrl: true,
          subcategories: true,
          override: { select: { imageUrl: true } },
        },
      }),
      this.prisma.eventSession.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: ids },
          isActive: true,
          canceledAt: null,
          startsAt: { gt: now },
        },
        _count: { id: true },
      }),
      this.prisma.eventOffer.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: ids },
          isDeleted: false,
          status: OfferStatus.ACTIVE,
          priceFrom: { gt: 0 },
        },
        _count: { id: true },
      }),
      this.prisma.eventSubcategoryLink.groupBy({
        by: ['eventId'],
        where: { eventId: { in: ids } },
        _count: { _all: true },
      }),
    ]);

    const futureById = new Map(futureSessions.map((r) => [r.eventId, r._count.id]));
    const pricedById = new Map(pricedOffers.map((r) => [r.eventId, r._count.id]));
    const linksById = new Map(linkCounts.map((r) => [r.eventId, r._count._all]));

    const items = events.map((e) => {
      const effImage = e.override?.imageUrl ?? e.imageUrl;
      const hasImage = Boolean(effImage);
      const hasFutureSessions = (futureById.get(e.id) ?? 0) > 0;
      const hasPrice = (pricedById.get(e.id) ?? 0) > 0;
      const linksCount = linksById.get(e.id) ?? 0;
      const legacyCount = Array.isArray(e.subcategories) ? e.subcategories.length : 0;
      const { flags, issueCodes } = computeAdminEventQuickHealth({
        hasImage,
        hasPrice,
        hasFutureSessions,
        linksCount,
        legacySubcategoryCount: legacyCount,
      });

      return {
        id: e.id,
        flags,
        issueCodes,
      };
    });

    return { items };
  }

  @Get()
  async list(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('source') source?: string,
    @Query('active') active?: string,
    @Query('hidden') hidden?: string,
    @Query('search') search?: string,
    @Query('isPast') isPast?: string,
    @Query('isArchived') isArchived?: string,
    @Query('isIndexable') isIndexable?: string,
    @Query('pastDays') pastDays?: string,
    @Query('section') section?: string,
    @Query('subcategory') subcategory?: string,
    @Query('hasNoSubcategory') hasNoSubcategory?: string,
    @Query('hasMultipleSubcategories') hasMultipleSubcategories?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('operator') operatorSlug?: string,
    @Query('hasFutureSessions') hasFutureSessions?: string,
    @Query('hasCategoryPrices') hasCategoryPrices?: string,
    @Query('missingImage') missingImage?: string,
    @Query('hasOverride') hasOverride?: string,
    @Query('issuesPreset') issuesPreset?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit });
    const andParts: Prisma.EventWhereInput[] = [{ isDeleted: false }];
    if (city) andParts.push({ city: { slug: city } });
    if (category) {
      andParts.push({ category: category as EventCategory });
    }
    if (source) {
      andParts.push({ source: source as EventSource });
    }
    if (active !== undefined) andParts.push({ isActive: active === 'true' });
    if (search) {
      const trimmed = search.trim();
      andParts.push({
        OR: [
          { title: { contains: trimmed, mode: 'insensitive' } },
          { slug: { contains: trimmed, mode: 'insensitive' } },
          { tcEventId: trimmed },
          { offers: { some: { externalEventId: trimmed } } },
        ],
      });
    }
    if (hidden === 'true') {
      andParts.push({ override: { isHidden: true } });
    } else if (hidden === 'false') {
      andParts.push({
        OR: [{ override: null }, { override: { isHidden: false } }],
      });
    }

    const hasOv = hasOverride === '1' || hasOverride === 'true' || hasOverride === 'yes';
    if (hasOv) {
      andParts.push({ NOT: { override: null } });
    }

    const missingImg =
      missingImage === '1' || missingImage === 'true' || missingImage === 'yes';
    if (missingImg) {
      // Effective image is (override.imageUrl ?? event.imageUrl)
      // Missing iff event.imageUrl is null AND (override is null OR override.imageUrl is null)
      andParts.push({
        imageUrl: null,
        OR: [{ override: null }, { override: { imageUrl: null } }],
      });
    }

    // Archive / index policy (legacy schema mode):
    // - isPast is derived from presence of future active sessions.
    // - isArchived is derived as (isActive=false) for imported events (source != MANUAL).
    // Default behavior for admin UX: hide imported past events + imported archived events from the main list.
    const now = new Date();
    const pastBool = parseBool(isPast) ? true : isPast === '0' || isPast === 'false' || isPast === 'no' ? false : undefined;
    const archivedBool =
      isArchived === '1' || isArchived === 'true' || isArchived === 'yes'
        ? true
        : isArchived === '0' || isArchived === 'false' || isArchived === 'no'
          ? false
          : undefined;
    const indexableBool =
      isIndexable === '1' || isIndexable === 'true' || isIndexable === 'yes'
        ? true
        : isIndexable === '0' || isIndexable === 'false' || isIndexable === 'no'
          ? false
          : undefined;

    if (archivedBool === true) {
      andParts.push({ source: { not: EventSource.MANUAL }, isActive: false });
    } else if (archivedBool === false || archivedBool === undefined) {
      // default: exclude archived (imported inactive) unless explicitly requested
      andParts.push({ OR: [{ source: EventSource.MANUAL }, { isActive: true }] });
    }

    // Past filter is intentionally applied mainly to imported events to keep admin clean without hiding manual drafts.
    const futureSessionsWhere: Prisma.EventSessionWhereInput = { startsAt: { gt: now }, isActive: true };
    if (pastBool === true) {
      andParts.push({
        OR: [
          { source: EventSource.MANUAL },
          { sessions: { none: futureSessionsWhere } },
        ],
      });
    } else if (pastBool === false || pastBool === undefined) {
      // default: hide past imported events (no future active sessions)
      andParts.push({
        OR: [
          { source: EventSource.MANUAL },
          { sessions: { some: futureSessionsWhere } },
        ],
      });
    }

    // isIndexable is currently derived: past => false, active future => true.
    // This param is supported for filtering UX; it does not persist a flag yet.
    if (indexableBool === true) {
      andParts.push({ sessions: { some: futureSessionsWhere } });
    } else if (indexableBool === false) {
      andParts.push({ sessions: { none: futureSessionsWhere } });
    }

    const opTrim = operatorSlug?.trim();
    if (opTrim) {
      andParts.push({ operator: { slug: opTrim } });
    }

    const futureSessionsWhereActive: Prisma.EventSessionWhereInput = {
      startsAt: { gt: now },
      isActive: true,
      canceledAt: null,
    };

    const hasFs =
      hasFutureSessions === '1' || hasFutureSessions === 'true' || hasFutureSessions === 'yes';
    const hasFsFalse =
      hasFutureSessions === '0' || hasFutureSessions === 'false' || hasFutureSessions === 'no';
    if (hasFs) {
      andParts.push({ sessions: { some: futureSessionsWhereActive } });
    } else if (hasFsFalse) {
      andParts.push({ sessions: { none: futureSessionsWhereActive } });
    }

    const hasCp =
      hasCategoryPrices === '1' || hasCategoryPrices === 'true' || hasCategoryPrices === 'yes';
    const hasCpFalse =
      hasCategoryPrices === '0' || hasCategoryPrices === 'false' || hasCategoryPrices === 'no';
    if (hasCp) {
      andParts.push({
        offers: {
          some: { isDeleted: false, status: OfferStatus.ACTIVE, priceFrom: { gt: 0 } },
        },
      });
    } else if (hasCpFalse) {
      andParts.push({
        offers: {
          none: { isDeleted: false, status: OfferStatus.ACTIVE, priceFrom: { gt: 0 } },
        },
      });
    }

    const pastDaysNum = pastDays ? Math.max(1, Math.min(365, parseInt(pastDays, 10) || 0)) : 0;
    if (pastDaysNum > 0) {
      const from = new Date(now.getTime() - pastDaysNum * 24 * 60 * 60 * 1000);
      // Past in window: no future sessions + at least one session in [from, now)
      andParts.push({
        sessions: {
          none: futureSessionsWhere,
          some: { startsAt: { gte: from, lt: now } },
        },
      });
    }

    const preset = (issuesPreset ?? '').trim().toLowerCase();
    if (preset === 'api') {
      // Operational issues that block a storefront-safe publish.
      andParts.push({
        OR: [
          { venueId: null },
          { subcategoryLinks: { none: {} } },
          { offers: { none: { isDeleted: false, status: OfferStatus.ACTIVE, priceFrom: { gt: 0 } } } },
          { sessions: { none: futureSessionsWhereActive } },
          { imageUrl: null, OR: [{ override: null }, { override: { imageUrl: null } }] },
        ],
      });
    }

    // Derived classification filters (canonical source: event_subcategory_links).
    const sectionTrim = section?.trim() as SectionSlug | undefined;
    if (sectionTrim) {
      const allowed: readonly SectionSlug[] = ['events', 'excursions', 'museums', 'activities', 'entertainment'];
      if (!allowed.includes(sectionTrim)) {
        throw new BadRequestException('Invalid "section"');
      }
      const slugs = getSubcategorySlugsForSection(sectionTrim);
      andParts.push({
        subcategoryLinks: {
          some: { subcategory: { slug: { in: slugs } } },
        },
      });
    }

    const subcategoryTrim = subcategory?.trim();
    if (subcategoryTrim) {
      andParts.push({
        subcategoryLinks: {
          // NOTE: we filter by exact slug; the UI selector uses active options only.
          some: { subcategory: { slug: subcategoryTrim } },
        },
      });
    }

    const hasNo =
      hasNoSubcategory === '1' || hasNoSubcategory === 'true' || hasNoSubcategory === 'yes';
    const hasNoExplicitFalse =
      hasNoSubcategory === '0' || hasNoSubcategory === 'false' || hasNoSubcategory === 'no';
    if (hasNo) {
      // "no subcategory" means no links at all (including legacy/inactive)
      andParts.push({ subcategoryLinks: { none: {} } });
    } else if (hasNoExplicitFalse) {
      andParts.push({ subcategoryLinks: { some: {} } });
    }

    const hasMulti =
      hasMultipleSubcategories === '1' ||
      hasMultipleSubcategories === 'true' ||
      hasMultipleSubcategories === 'yes';
    const hasMultiExplicitFalse =
      hasMultipleSubcategories === '0' ||
      hasMultipleSubcategories === 'false' ||
      hasMultipleSubcategories === 'no';
    if (hasMulti) {
      const groups = await this.prisma.eventSubcategoryLink.groupBy({
        by: ['eventId'],
        _count: { _all: true },
      });
      const rows = groups as unknown as Array<{ eventId: string; _count: { _all: number } }>;
      const ids = rows.filter((g) => g._count._all > 1).map((g) => g.eventId);
      andParts.push({ id: { in: ids.length ? ids : ['00000000-0000-0000-0000-000000000000'] } });
    } else if (hasMultiExplicitFalse) {
      const groupsEq1 = await this.prisma.eventSubcategoryLink.groupBy({
        by: ['eventId'],
        _count: { _all: true },
      });
      const rowsEq1 = groupsEq1 as unknown as Array<{ eventId: string; _count: { _all: number } }>;
      const idsEq1 = rowsEq1.filter((g) => g._count._all === 1).map((g) => g.eventId);
      andParts.push({
        OR: [
          { subcategoryLinks: { none: {} } },
          { id: { in: idsEq1.length ? idsEq1 : ['00000000-0000-0000-0000-000000000000'] } },
        ],
      });
    }

    const where: Prisma.EventWhereInput = andParts.length === 1 ? andParts[0]! : { AND: andParts };

    const sortDirNorm = sortDir === 'asc' || sortDir === 'desc' ? sortDir : 'desc';
    const sortByNorm = (sortBy || '').trim();
    const orderBy: Prisma.EventOrderByWithRelationInput =
      sortByNorm === 'title'
        ? { title: sortDirNorm }
        : sortByNorm === 'source'
          ? { source: sortDirNorm }
          : sortByNorm === 'city'
            ? { city: { name: sortDirNorm } }
            : { updatedAt: 'desc' };

    const [rawItems, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          city: { select: { slug: true, name: true } },
          venue: { select: { id: true, title: true, slug: true } },
          operator: { select: { id: true, name: true, slug: true } },
          _count: { select: { sessions: true, tags: true, offers: true } },
          override: true,
          subcategoryLinks: {
            include: {
              subcategory: { select: { id: true, slug: true, nameRu: true, isActive: true, layer: true, type: true } },
            },
          },
        },
        orderBy,
        ...paginationArgs(pg),
      }),
      this.prisma.event.count({ where }),
    ]);

    const result = buildPaginatedResult(rawItems, total, pg.limit);

    const eventIds = result.items.map((e) => e.id);
    const [lastSessionMax, nextFutureMin, futureSessionCounts, minPricedOffers] = eventIds.length
      ? await Promise.all([
          this.prisma.eventSession.groupBy({
            by: ['eventId'],
            where: { eventId: { in: eventIds } },
            _max: { startsAt: true },
          }),
          this.prisma.eventSession.groupBy({
            by: ['eventId'],
            where: {
              eventId: { in: eventIds },
              isActive: true,
              canceledAt: null,
              startsAt: { gt: now },
            },
            _min: { startsAt: true },
          }),
          this.prisma.eventSession.groupBy({
            by: ['eventId'],
            where: {
              eventId: { in: eventIds },
              isActive: true,
              canceledAt: null,
              startsAt: { gt: now },
            },
            _count: { id: true },
          }),
          this.prisma.eventOffer.groupBy({
            by: ['eventId'],
            where: {
              eventId: { in: eventIds },
              isDeleted: false,
              status: OfferStatus.ACTIVE,
              priceFrom: { gt: 0 },
            },
            _min: { priceFrom: true },
          }),
        ])
      : [[], [], [], []];

    const lastSessionAtByEventId = new Map<string, Date>();
    for (const row of lastSessionMax) {
      const r = row as unknown as { eventId: string; _max: { startsAt: Date | null } };
      const d = r._max.startsAt;
      if (d) lastSessionAtByEventId.set(r.eventId, d);
    }

    const nextFutureSessionAtByEventId = new Map<string, Date>();
    for (const row of nextFutureMin as Array<{ eventId: string; _min: { startsAt: Date | null } }>) {
      const d = row._min.startsAt;
      if (d) nextFutureSessionAtByEventId.set(row.eventId, d);
    }

    const futureSessionCountByEventId = new Map<string, number>();
    for (const row of futureSessionCounts as Array<{ eventId: string; _count: { id: number } }>) {
      futureSessionCountByEventId.set(row.eventId, row._count.id);
    }

    const minOfferPriceByEventId = new Map<string, number>();
    for (const row of minPricedOffers as Array<{ eventId: string; _min: { priceFrom: number | null } }>) {
      const p = row._min.priceFrom;
      if (p != null && p > 0) minOfferPriceByEventId.set(row.eventId, p);
    }

    const items = result.items.map((e) => {
      const allSubcats = (e.subcategoryLinks ?? [])
        .map((l) => l.subcategory)
        .filter(
          (s): s is {
            id: string;
            slug: string;
            nameRu: string;
            isActive: boolean;
            layer: SubcategoryLayer;
            type: SubcategoryType;
          } => Boolean(s),
        );

      const lastSessionAt = lastSessionAtByEventId.get(e.id) ?? null;
      const derivedIsPast = lastSessionAt ? lastSessionAt < now : false;
      const derivedIsArchived = isImportedArchived({ source: e.source, isActive: e.isActive });
      const derivedIsIndexable = !derivedIsPast && !derivedIsArchived;

      const nextFutureAt = nextFutureSessionAtByEventId.get(e.id) ?? null;
      const futureSessionsCount = futureSessionCountByEventId.get(e.id) ?? 0;
      const offerMin = minOfferPriceByEventId.get(e.id);
      const eventPf = e.priceFrom != null && e.priceFrom > 0 ? e.priceFrom : null;
      const priceFromMinKopecks =
        offerMin != null && eventPf != null
          ? Math.min(offerMin, eventPf)
          : offerMin ?? eventPf ?? null;

      const effImage = e.override?.imageUrl ?? e.imageUrl;
      const hasImage = Boolean(effImage);
      const hasPricedOffer = (offerMin != null && offerMin > 0) || (e.priceFrom != null && e.priceFrom > 0);
      const linksCount = (e.subcategoryLinks ?? []).length;
      const legacyCount = Array.isArray(e.subcategories) ? e.subcategories.length : 0;
      const quickHealth = computeAdminEventQuickHealth({
        hasImage,
        hasPrice: hasPricedOffer,
        hasFutureSessions: futureSessionsCount > 0,
        linksCount,
        legacySubcategoryCount: legacyCount,
      });
      const readinessStatus = readinessFromIssueCodes(quickHealth.issueCodes).readinessStatus;
      const readinessScore = readinessScoreFromQuickHealth({
        flags: quickHealth.flags,
        issueCodes: quickHealth.issueCodes,
      });

      return {
        ...e,
        supplier: e.operator ? { id: e.operator.id, name: e.operator.name, slug: e.operator.slug } : null,
        venueShort: e.venue ? { id: e.venue.id, name: e.venue.title, slug: e.venue.slug } : null,
        subcategoriesCanonical: allSubcats.map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.nameRu,
          isActive: s.isActive,
          layer: s.layer,
          subcategoryType: s.type,
        })),
        sectionsDerived: deriveSectionsFromSubcategories(allSubcats.map((s) => ({ slug: s.slug }))),
        lastSessionAt: lastSessionAt ? lastSessionAt.toISOString() : null,
        nextSessionAt: nextFutureAt ? nextFutureAt.toISOString() : null,
        futureSessionsCount,
        priceFromMin: priceFromMinKopecks,
        categoriesCount: e._count?.offers ?? 0,
        readinessSummary: {
          status: readinessStatus,
          score: readinessScore,
          issueCodes: quickHealth.issueCodes,
        },
        isPast: derivedIsPast,
        isArchived: derivedIsArchived,
        isIndexable: derivedIsIndexable,
      };
    });

    return {
      ...result,
      items,
      page: pg.page,
      pages: Math.ceil(total / pg.limit) || 1,
    };
  }

  /**
   * Safe batch archive for imported events (dry-run only).
   *
   * Rules:
   * - only imported sources (TICKETSCLOUD / TEPLOHOD)
   * - only events without future active sessions
   * - dryRun обязательный (не архивирует реально в первой версии)
   * - explicit source filter required
   */
  @Post('archive/batch')
  @Roles('ADMIN', 'EDITOR')
  async batchArchiveImported(@Body() dto: BatchArchiveImportedEventsDto) {
    const source = String(dto.source || '').toUpperCase();
    if (source !== 'TICKETSCLOUD' && source !== 'TEPLOHOD') {
      throw new BadRequestException('source должен быть TICKETSCLOUD или TEPLOHOD');
    }

    const now = new Date();
    const threshold = new Date(now.getTime() - dto.olderThanDays * 24 * 60 * 60 * 1000);
    const take = Math.min(2000, Math.max(1, dto.take ?? 500));

    const futureSessionsWhere: Prisma.EventSessionWhereInput = { startsAt: { gt: now }, isActive: true };

    // Preselect candidate ids (no future sessions, active now).
    const candidates = await this.prisma.event.findMany({
      where: {
        isDeleted: false,
        source: source as EventSource,
        isActive: true,
        sessions: { none: futureSessionsWhere },
      },
      select: { id: true, title: true, source: true },
      orderBy: { updatedAt: 'desc' },
      take,
    });

    const ids = candidates.map((c) => c.id);
    if (ids.length === 0) {
      return { count: 0, ids: [], items: [] as Array<{ id: string; title: string; source: EventSource; lastSessionAt: string | null }> };
    }

    const lastSessionMax = await this.prisma.eventSession.groupBy({
      by: ['eventId'],
      where: { eventId: { in: ids } },
      _max: { startsAt: true },
    });
    const lastSessionAtByEventId = new Map<string, Date>();
    for (const row of lastSessionMax) {
      const r = row as unknown as { eventId: string; _max: { startsAt: Date | null } };
      const d = r._max.startsAt;
      if (d) lastSessionAtByEventId.set(r.eventId, d);
    }

    const items = candidates
      .map((e) => {
        const lastSessionAt = lastSessionAtByEventId.get(e.id) ?? null;
        return {
          id: e.id,
          title: e.title,
          source: e.source,
          lastSessionAt: lastSessionAt ? lastSessionAt.toISOString() : null,
        };
      })
      .filter((e) => e.lastSessionAt && new Date(e.lastSessionAt) < threshold);

    // Dry-run returns candidates only (no changes).
    if (dto.dryRun) {
      return {
        dryRun: true,
        source,
        olderThanDays: dto.olderThanDays,
        take,
        count: items.length,
        ids: items.map((i) => i.id),
        items,
      };
    }

    // Execute: archive those exact candidates (still safe: only imported, no future sessions).
    // Hard safety cap to avoid accidental large runs.
    if (items.length > 1000) {
      throw new BadRequestException('Слишком много кандидатов для execute (лимит 1000). Увеличьте olderThanDays или снизьте take.');
    }

    const idsToArchive = items.map((i) => i.id);
    const updated = await this.prisma.event.updateMany({
      where: {
        id: { in: idsToArchive },
        isDeleted: false,
        source: source as EventSource,
        isActive: true,
        sessions: { none: futureSessionsWhere },
      },
      data: { isActive: false },
    });

    // Invalidate caches for updated ids (best-effort).
    await Promise.all(idsToArchive.map((id) => this.cacheInvalidation.invalidateEventById(id)));

    const postRows = await this.prisma.event.findMany({
      where: { id: { in: idsToArchive } },
      select: {
        id: true,
        isActive: true,
        sessions: { where: futureSessionsWhere, select: { id: true }, take: 1 },
      },
    });
    const postById = new Map(postRows.map((r) => [r.id, r]));

    const skipped: Array<{
      id: string;
      reason: 'FUTURE_SESSIONS' | 'ALREADY_ARCHIVED' | 'NOT_FOUND' | 'OTHER';
    }> = [];
    const archivedIds: string[] = [];

    for (const id of idsToArchive) {
      const row = postById.get(id);
      if (!row) {
        skipped.push({ id, reason: 'NOT_FOUND' });
        continue;
      }
      if (row.sessions.length > 0) {
        skipped.push({ id, reason: 'FUTURE_SESSIONS' });
        continue;
      }
      if (row.isActive === false) {
        archivedIds.push(id);
      } else {
        skipped.push({ id, reason: 'OTHER' });
      }
    }

    return {
      dryRun: false,
      source,
      olderThanDays: dto.olderThanDays,
      take,
      count: items.length,
      ids: idsToArchive,
      items,
      archivedCount: updated.count,
      archivedIds,
      skipped,
    };
  }

  /**
   * Экспорт всех событий в CSV (cursor-based streaming).
   */
  @Get('export/csv')
  @Roles('ADMIN', 'EDITOR')
  async exportEventsCsv(@Res() res: Response) {
    await streamCsv({
      res,
      filename: 'events',
      fields: [
        { header: 'id', accessor: (e) => String((e as Record<string, unknown>).id ?? '') },
        { header: 'tcEventId', accessor: (e) => String((e as Record<string, unknown>).tcEventId ?? '') },
        { header: 'title', accessor: (e) => String((e as Record<string, unknown>).title ?? '') },
        { header: 'slug', accessor: (e) => String((e as Record<string, unknown>).slug ?? '') },
        { header: 'city', accessor: (e) => String(((e as Record<string, unknown>).city as { name?: string })?.name ?? '') },
        { header: 'citySlug', accessor: (e) => String(((e as Record<string, unknown>).city as { slug?: string })?.slug ?? '') },
        { header: 'category', accessor: (e) => String((e as Record<string, unknown>).category ?? '') },
        { header: 'source', accessor: (e) => String((e as Record<string, unknown>).source ?? '') },
        { header: 'priceFrom', accessor: (e) => String((e as Record<string, unknown>).priceFrom ?? '') },
        { header: 'isActive', accessor: (e) => String((e as Record<string, unknown>).isActive ?? '') },
        { header: 'address', accessor: (e) => String((e as Record<string, unknown>).address ?? '') },
        { header: 'lastSyncAt', accessor: (e) => ((e as Record<string, unknown>).lastSyncAt as Date)?.toISOString?.() ?? '' },
        { header: 'createdAt', accessor: (e) => ((e as Record<string, unknown>).createdAt as Date)?.toISOString?.() ?? '' },
      ],
      fetchBatch: (cursor, take) =>
        this.prisma.event.findMany({
          where: { isDeleted: false },
          include: { city: { select: { name: true, slug: true } } },
          orderBy: { updatedAt: 'desc' },
          take,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
    });
  }

  /**
   * Кандидаты на дедупликацию (dry-run, без изменений).
   */
  @Get('deduplicate-candidates')
  @Roles('ADMIN')
  async getDeduplicateCandidates() {
    const { candidates } = await this.fuzzyDedupService.findDuplicates(true);
    return { candidates };
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
   * Поиск событий для связи в группы (admin UI).
   */
  @Get('search')
  @Roles('ADMIN', 'EDITOR')
  async searchEvents(@Query('query') query?: string) {
    const trimmed = query?.trim();
    if (!trimmed) {
      return [];
    }

    const items = await this.prisma.event.findMany({
      where: {
        isDeleted: false,
        OR: [
          { title: { contains: trimmed, mode: 'insensitive' } },
          { slug: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      include: {
        city: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return items.map((e) => ({
      id: e.id,
      title: e.title,
      cityName: e.city?.name ?? '',
    }));
  }

  /**
   * Кросс-событийный обзор сеансов (фильтр по датам и городу).
   * GET /admin/events/sessions/overview?from&to&city&take&issuesOnly
   * При issuesOnly=true запрашивается расширенная выборка (до 1500 строк по времени), затем фильтр по непустым issues.
   */
  @Get('sessions/overview')
  @Roles('ADMIN', 'EDITOR')
  async getSessionsOverview(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('city') citySlug?: string,
    @Query('take') takeStr?: string,
    @Query('issuesOnly') issuesOnly?: string,
  ): Promise<AdminSessionsOverviewDto> {
    const take = Math.min(500, Math.max(1, parseInt(takeStr ?? '200', 10) || 200));
    const issuesOnlyBool = issuesOnly === '1' || issuesOnly === 'true' || issuesOnly === 'yes';
    const fetchLimit = issuesOnlyBool
      ? Math.min(1500, Math.max(take + 1, take * 6))
      : take + 1;

    const now = new Date();
    const fromDate = from ? new Date(from) : now;
    if (Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException('Invalid "from" date');
    }
    let toDate = to ? new Date(to) : new Date(fromDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid "to" date');
    }
    const maxRangeMs = 93 * 24 * 60 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() > maxRangeMs) {
      toDate = new Date(fromDate.getTime() + maxRangeMs);
    }
    if (toDate.getTime() < fromDate.getTime()) {
      throw new BadRequestException('"to" must be after "from"');
    }

    const eventWhere: Prisma.EventWhereInput = { isDeleted: false };
    const cityTrim = citySlug?.trim();
    if (cityTrim) {
      eventWhere.city = { slug: cityTrim };
    }

    const sessions = await this.prisma.eventSession.findMany({
      where: {
        startsAt: { gte: fromDate, lte: toDate },
        event: eventWhere,
      },
      take: fetchLimit,
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        capacityTotal: true,
        isActive: true,
        canceledAt: true,
        cancelReason: true,
        offerId: true,
        prices: true,
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            source: true,
            defaultCapacityTotal: true,
            city: { select: { slug: true, name: true } },
          },
        },
      },
    });

    const hitFetchCap = sessions.length >= fetchLimit;
    const sessionIds = sessions.map((s) => s.id);

    const soldBySessionId: Record<string, number> = {};
    if (sessionIds.length > 0) {
      const sold = await this.prisma.packageItem.groupBy({
        by: ['sessionId'],
        where: {
          sessionId: { in: sessionIds },
          status: { in: ['BOOKED', 'CONFIRMED'] },
        },
        _sum: {
          adultTickets: true,
          childTickets: true,
        },
      });
      for (const row of sold) {
        soldBySessionId[row.sessionId] = (row._sum.adultTickets ?? 0) + (row._sum.childTickets ?? 0);
      }
    }

    const allRows: AdminSessionsOverviewDto['rows'] = sessions.map((s) => {
      const soldCount = soldBySessionId[s.id] ?? 0;
      const event = s.event;
      const base = this.buildAdminSessionRow(
        {
          id: s.id,
          startsAt: s.startsAt,
          endsAt: s.endsAt ?? null,
          capacityTotal: s.capacityTotal ?? null,
          canceledAt: s.canceledAt,
          cancelReason: s.cancelReason,
          isActive: s.isActive,
        },
        { source: event.source, defaultCapacityTotal: event.defaultCapacityTotal ?? null },
        soldCount,
      );

      const cap = base.capacity ?? null;
      const issues: string[] = [];
      if (s.canceledAt) {
        issues.push('CANCELLED');
      } else {
        if (!s.isActive) issues.push('PAUSED');
        if (cap !== null && cap <= 0) issues.push('CAPACITY_ZERO');
        if (cap !== null && cap > 0 && soldCount >= cap) issues.push('SOLD_OUT');
      }
      if (!s.offerId) issues.push('NO_OFFER_LINK');
      const pricesArr = Array.isArray(s.prices) ? s.prices : [];
      if (pricesArr.length === 0) issues.push('NO_PRICE');

      return {
        sessionId: s.id,
        eventId: event.id,
        eventTitle: event.title,
        eventSlug: event.slug,
        citySlug: event.city.slug,
        cityName: event.city.name,
        startsAt: base.startsAt,
        endsAt: base.endsAt,
        capacity: base.capacity,
        soldCount: base.soldCount,
        locked: base.locked,
        lockReason: base.lockReason,
        isCancelled: base.isCancelled,
        canceledAt: base.canceledAt,
        cancelReason: base.cancelReason,
        offerId: s.offerId,
        eventSource: event.source,
        sessionIsActive: s.isActive,
        issues,
      };
    });

    let rows: AdminSessionsOverviewDto['rows'];
    let truncated: boolean;
    if (issuesOnlyBool) {
      const withIssues = allRows.filter((r) => r.issues.length > 0);
      truncated = hitFetchCap || withIssues.length > take;
      rows = withIssues.slice(0, take);
    } else {
      truncated = sessions.length > take;
      rows = truncated ? allRows.slice(0, take) : allRows;
    }

    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      truncated,
      rows,
    };
  }

  /**
   * Массовая пауза / возобновление продажи слотов (только MANUAL, будущие, не отменённые).
   * POST /admin/events/sessions/bulk
   */
  @Post('sessions/bulk')
  @Roles('ADMIN', 'EDITOR')
  async bulkSessions(@Body() body: AdminSessionsBulkDto): Promise<AdminSessionsBulkResponseDto> {
    const uniqueIds = [...new Set(body.sessionIds.map((id) => id.trim()).filter(Boolean))];
    const ids = uniqueIds.slice(0, 100);
    if (ids.length === 0) {
      throw new BadRequestException('sessionIds обязателен');
    }

    const results: AdminSessionsBulkResponseDto['results'] = [];
    const now = new Date();

    for (const id of ids) {
      try {
        const { session, event } = await this.getSessionWithEvent(id);
        if (event.source !== 'MANUAL') {
          results.push({ id, ok: false, error: 'IMPORTED' });
          continue;
        }
        if (session.canceledAt) {
          results.push({ id, ok: false, error: 'CANCELLED' });
          continue;
        }
        if (session.startsAt < now) {
          results.push({ id, ok: false, error: 'PAST' });
          continue;
        }
        if (body.action === 'pause') {
          const soldCount = await this.getSessionSoldCount(id);
          const cap = session.capacityTotal ?? event.defaultCapacityTotal ?? null;
          if (cap != null && cap > 0 && soldCount >= cap) {
            results.push({ id, ok: false, error: 'SOLD_OUT' });
            continue;
          }
          if (!session.isActive) {
            results.push({ id, ok: true });
            continue;
          }
          await this.prisma.eventSession.update({
            where: { id },
            data: { isActive: false },
          });
          results.push({ id, ok: true });
        } else {
          if (session.isActive) {
            results.push({ id, ok: true });
            continue;
          }
          await this.prisma.eventSession.update({
            where: { id },
            data: { isActive: true },
          });
          results.push({ id, ok: true });
        }
      } catch (e) {
        if (e instanceof NotFoundException) {
          results.push({ id, ok: false, error: 'NOT_FOUND' });
        } else {
          results.push({
            id,
            ok: false,
            error: e instanceof Error ? e.message.slice(0, 200) : 'UNKNOWN',
          });
        }
      }
    }

    return { results };
  }

  /**
   * Пометить событие как дубль другого (canonicalOfId).
   */
  @Patch(':id/mark-duplicate')
  @Roles('ADMIN')
  async markDuplicate(@Param('id') eventId: string, @Body('canonicalOfId') canonicalOfId: string) {
    if (!canonicalOfId) throw new BadRequestException('canonicalOfId обязателен');
    if (eventId === canonicalOfId) throw new BadRequestException('Нельзя пометить событие дублем самого себя');

    const target = await this.prisma.event.findUnique({ where: { id: canonicalOfId } });
    if (!target) throw new NotFoundException('Каноническое событие не найдено');

    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Событие не найдено');

    await this.prisma.event.update({
      where: { id: eventId },
      data: { canonicalOfId },
    });
    return { message: 'Событие помечено как дубль', canonicalOfId };
  }

  /**
   * Группа событий по groupingKey: детали для админки.
   */
  @Get(':id/group')
  @Roles('ADMIN', 'EDITOR')
  async getEventGroup(@Param('id') eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        city: { select: { name: true } },
        override: { select: { isHidden: true } },
      },
    });
    if (!event || event.isDeleted) {
      throw new NotFoundException('Событие не найдено');
    }

    if (!event.groupingKey) {
      return {
        groupingKey: null as string | null,
        isCanonical: false,
        canonicalEventId: null as string | null,
        items: [] as {
          id: string;
          title: string;
          cityName: string;
          source: string;
          isActive: boolean;
          isHidden: boolean;
        }[],
      };
    }

    const groupEvents = await this.prisma.event.findMany({
      where: {
        groupingKey: event.groupingKey,
        isDeleted: false,
      },
      include: {
        city: { select: { name: true } },
        override: { select: { isHidden: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!groupEvents.length) {
      return {
        groupingKey: event.groupingKey,
        isCanonical: true,
        canonicalEventId: event.id,
        items: [],
      };
    }

    // Каноническое событие внутри группы: сначала ищем без canonicalOfId, иначе берём самое раннее по createdAt.
    const canonical =
      groupEvents.find((e) => !e.canonicalOfId) ??
      groupEvents.reduce((acc, cur) => (cur.createdAt < acc.createdAt ? cur : acc), groupEvents[0]!);

    const canonicalEventId = canonical.id;

    return {
      groupingKey: event.groupingKey,
      isCanonical: event.id === canonicalEventId,
      canonicalEventId,
      items: groupEvents.map((e) => ({
        id: e.id,
        title: e.title,
        cityName: e.city?.name ?? '',
        source: e.source,
        isActive: e.isActive,
        isHidden: e.override?.isHidden ?? false,
      })),
    };
  }

  /**
   * Обновить groupingKey события (вступить/создать группу).
   */
  @Patch(':id/group')
  @Roles('ADMIN', 'EDITOR')
  async updateEventGrouping(
    @Param('id') eventId: string,
    @Body('groupingKey') groupingKey: string,
  ) {
    const trimmed = groupingKey?.trim();
    if (!trimmed) {
      throw new BadRequestException('groupingKey обязателен');
    }

    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.isDeleted) {
      throw new NotFoundException('Событие не найдено');
    }

    const shouldResetCanonical = event.groupingKey !== trimmed;

    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        groupingKey: trimmed,
        ...(shouldResetCanonical ? { canonicalOfId: null } : {}),
      },
    });

    return { groupingKey: trimmed };
  }

  /**
   * Удалить событие из группы (groupingKey = null).
   */
  @Delete(':id/group')
  @Roles('ADMIN', 'EDITOR')
  async clearEventGrouping(@Param('id') eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.isDeleted) {
      throw new NotFoundException('Событие не найдено');
    }

    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        groupingKey: null,
        canonicalOfId: null,
      },
    });

    return { groupingKey: null as string | null, canonicalEventId: null as string | null };
  }

  /**
   * Сделать событие каноническим внутри группы (через canonicalOfId).
   */
  @Post(':id/group/make-canonical')
  @Roles('ADMIN', 'EDITOR')
  async makeEventCanonical(@Param('id') eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.isDeleted) {
      throw new NotFoundException('Событие не найдено');
    }
    if (!event.groupingKey) {
      throw new BadRequestException('Событие не входит ни в одну группу');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.event.updateMany({
        where: {
          groupingKey: event.groupingKey,
          id: { not: event.id },
        },
        data: { canonicalOfId: event.id },
      });

      await tx.event.update({
        where: { id: event.id },
        data: { canonicalOfId: null },
      });
    });

    return { canonicalEventId: event.id };
  }

  /**
   * Создать новое событие (ручное) + опционально первый оффер + templateData.
   */
  @Post()
  @Roles('ADMIN', 'EDITOR')
  async createEvent(@Body() data: CreateEventDto, @Request() req: { user: { id: string } }) {
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

    let resolvedStartLocationId: string | undefined;
    if (data.startLocationId) {
      const loc = await this.prisma.location.findFirst({
        where: { id: data.startLocationId, cityId: data.cityId, isActive: true },
        select: { id: true },
      });
      if (!loc) {
        throw new BadRequestException('Локация не найдена или не относится к выбранному городу');
      }
      resolvedStartLocationId = loc.id;
    }

    const templateBase: Record<string, unknown> =
      typeof data.templateData === 'object' && data.templateData !== null && !Array.isArray(data.templateData)
        ? { ...data.templateData }
        : {};

    if (!resolvedStartLocationId && data.locationProposal?.title?.trim()) {
      templateBase.pendingLocationProposal = {
        title: data.locationProposal.title.trim(),
        address: data.locationProposal.address?.trim() || undefined,
        type: data.locationProposal.type ?? 'OTHER',
        submittedAt: new Date().toISOString(),
      };
    }

    // Create in transaction
    const result = await this.prisma.$transaction(async (tx): Promise<{ event: { id: string }; offer: { id: string } | null }> => {
      // Create event — generate a unique tcEventId for manual events
      const event = await tx.event.create({
        data: {
          source: OfferSource.MANUAL,
          tcEventId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          cityId: data.cityId,
          title: normalizeEventTitle(data.title || ''),
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
          startLocationId: resolvedStartLocationId ?? null,
          isActive: true,
          createdByType: 'ADMIN',
          createdById: req.user.id,
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

      // Create override with templateData if provided (включая pendingLocationProposal из createEvent).
      // Важно использовать тот же транзакционный клиент (tx), иначе FK на eventId
      // может сработать до коммита события и дать ошибку `event_overrides_eventId_fkey`.
      if (Object.keys(templateBase).length > 0) {
        await tx.eventOverride.upsert({
          where: { eventId: event.id },
          create: {
            eventId: event.id,
            templateData: toJsonValue(templateBase),
            updatedBy: req.user.id,
          },
          update: {
            templateData: toJsonValue(templateBase),
            updatedBy: req.user.id,
          },
        });
      }

      return { event, offer };
    });

    return result;
  }

  /**
   * Клонировать событие для быстрого создания похожего.
   *
   * POST /admin/events/:id/duplicate
   *
   * Копирует основные поля контента (title, description, imageUrl, galleryUrls,
   * durationMinutes, minAge, address, priceFrom, groupingKey), но НЕ копирует
   * сессии, заказы и рейтинги.
   *
   * Новый slug формируется на основе исходного (`{slug}-copy`, `...-copy-2` и т.д.),
   * заголовок помечается префиксом `[COPY] `.
   */
  @Post(':id/duplicate')
  @Roles('ADMIN', 'EDITOR')
  async duplicateEvent(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    const original = await this.prisma.event.findUnique({
      where: { id },
      include: {
        override: true,
      },
    });

    if (!original || original.isDeleted) {
      throw new NotFoundException('Событие не найдено');
    }

    // Базовый slug для копии
    const baseSlug = `${original.slug}-copy`;
    let slug = baseSlug;
    let suffix = 1;

    // Подбираем уникальный slug для нового события
     
    while (true) {
      const existing = await this.prisma.event.findUnique({ where: { slug } });
      if (!existing) {
        break;
      }
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const title = `[COPY] ${original.title}`;

    const duplicate = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          source: OfferSource.MANUAL,
          tcEventId: `manual-copy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          cityId: original.cityId,
          title: normalizeEventTitle(title),
          normalizedTitle: original.normalizedTitle,
          groupingKey: original.groupingKey,
          slug,
          description: original.description,
          shortDescription: original.shortDescription,
          category: original.category,
          subcategories: original.subcategories,
          audience: original.audience,
          minAge: original.minAge,
          durationMinutes: original.durationMinutes,
          lat: original.lat,
          lng: original.lng,
          address: original.address,
          indoor: original.indoor,
          imageUrl: original.imageUrl,
          galleryUrls: original.galleryUrls,
          priceFrom: original.priceFrom,
          isActive: false,
          venueId: original.venueId,
          dateMode: original.dateMode,
          isPermanent: original.isPermanent,
          endDate: original.endDate,
          defaultCapacityTotal: original.defaultCapacityTotal,
          startLocationId: original.startLocationId,
          endLocationId: original.endLocationId,
          operatorId: original.operatorId,
          routeId: original.routeId,
          supplierId: original.supplierId,
          createdByType: 'ADMIN',
          createdById: req.user.id,
        },
      });

      // Скопировать Override, если он есть (контент, теги, templateData).
      if (original.override) {
        await tx.eventOverride.create({
          data: {
            eventId: event.id,
            title: original.override.title,
            description: original.override.description,
            imageUrl: original.override.imageUrl,
            category: original.override.category ?? null,
            subcategories: original.override.subcategories,
            audience: original.override.audience ?? null,
            minAge: original.override.minAge ?? null,
            manualRating: original.override.manualRating,
            isHidden: original.override.isHidden,
            tagsAdd: original.override.tagsAdd,
            tagsRemove: original.override.tagsRemove,
            templateData: original.override.templateData as Prisma.InputJsonValue,
            subcategoriesMode: original.override.subcategoriesMode,
            subcategoriesOverride: original.override.subcategoriesOverride,
            updatedBy: req.user.id,
          },
        });
      }

      return event;
    });

    await this.cacheInvalidation.invalidateEventById(duplicate.id);

    return {
      id: duplicate.id,
      slug: duplicate.slug,
      title: duplicate.title,
    };
  }

  /**
   * Обновить slug события вручную.
   *
   * Правила:
   * - slug нормализуется так же, как при создании (транслитерация + lower-case + `[^a-z0-9]` → `-`)
   * - при конфликте добавляется суффикс -2, -3 и т.д.
   */
  @Patch(':id/slug')
  @Roles('ADMIN', 'EDITOR')
  async updateEventSlug(@Param('id') id: string, @Body() body: UpdateEventSlugDto) {
    const base = this.transliterate(body.slug || '');
    if (!base) {
      throw new BadRequestException('Slug не может быть пустым');
    }

    let slug = base;
    let suffix = 1;
    // Ищем свободный slug с учётом текущего события
    // (если slug уже принадлежит этому событию — обновляем без изменений).
    // Поскольку это админский эндпоинт, несколько последовательных запросов допустимы.
     
    while (true) {
      const existing = await this.prisma.event.findUnique({ where: { slug } });
      if (!existing || existing.id === id) {
        break;
      }
      suffix += 1;
      slug = `${base}-${suffix}`;
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: { slug },
    });

    await this.cacheInvalidation.invalidateEventById(updated.id);

    return { slug: updated.slug };
  }

  /**
   * Оценка готовности события к публикации (on-demand).
   *
   * GET /admin/events/:id/quality
   */
  /**
   * Единый read-model для админки: готовность, продвижение, операции, коммерция (частично), интеграция.
   *
   * GET /admin/events/:id/summary
   */
  @Get(':id/summary')
  @Roles('ADMIN', 'EDITOR')
  async getEventSummary(@Param('id') eventId: string): Promise<EventAdminSummaryDto> {
    return this.eventAdminSummary.getSummary(eventId);
  }

  @Get(':id/quality')
  @Roles('ADMIN', 'EDITOR')
  async getQuality(@Param('id') eventId: string): Promise<EventQualityDto> {
    const result = await this.eventQuality.validateForPublish(eventId);

    const issues = result.issues.map((issue) => ({
      code: issue.code,
      field: issue.field,
      message: issue.message,
      severity: this.mapIssueSeverity(issue),
      tabKey: this.mapIssueTabKey(issue),
      ...(issue.ownership && { ownership: issue.ownership }),
    }));

    return {
      isSellable: result.isReady,
      issues,
    };
  }

  /**
   * Диапазон сеансов события для админки (с агрегированным soldCount).
   *
   * GET /admin/events/:id/sessions?from&to
   */
  @Get(':id/sessions')
  @Roles('ADMIN', 'EDITOR')
  async getSessionsRange(
    @Param('id') eventId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('includeCancelled') includeCancelled?: string,
  ): Promise<AdminEventSessionsRangeDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, source: true, defaultCapacityTotal: true },
    });
    if (!event) {
      throw new NotFoundException('Событие не найдено');
    }

    const now = new Date();
    const fromDate = from ? new Date(from) : now;
    if (Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException('Invalid "from" date');
    }

    let toDate = to ? new Date(to) : new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid "to" date');
    }

    // Ограничиваем диапазон разумным максимумом (365 дней), чтобы избежать тяжёлых запросов.
    const maxRangeMs = 365 * 24 * 60 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() > maxRangeMs) {
      toDate = new Date(fromDate.getTime() + maxRangeMs);
    }

    const includeCancelledBool =
      includeCancelled === '1' || includeCancelled === 'true' || includeCancelled === 'yes';

    const cancelledCount = await this.prisma.eventSession.count({
      where: {
        eventId,
        startsAt: {
          gte: fromDate,
          lte: toDate,
        },
        canceledAt: { not: null },
      },
    });

    const sessions = await this.prisma.eventSession.findMany({
      where: {
        eventId,
        startsAt: {
          gte: fromDate,
          lte: toDate,
        },
        ...(includeCancelledBool ? {} : { canceledAt: null }),
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        capacityTotal: true,
        offerId: true,
        canceledAt: true,
        cancelReason: true,
        isActive: true,
      },
      orderBy: { startsAt: 'asc' },
    });

    if (sessions.length === 0) {
      return {
        eventId,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        cancelledCount,
        rows: [],
      };
    }

    const sessionIds = sessions.map((s) => s.id);

    const sold = await this.prisma.packageItem.groupBy({
      by: ['sessionId'],
      where: {
        sessionId: { in: sessionIds },
        status: { in: ['BOOKED', 'CONFIRMED'] },
      },
      _sum: {
        adultTickets: true,
        childTickets: true,
      },
    });

    const soldBySessionId: Record<string, number> = {};
    for (const row of sold) {
      const total = (row._sum.adultTickets ?? 0) + (row._sum.childTickets ?? 0);
      soldBySessionId[row.sessionId] = total;
    }

    const rows = sessions.map((s) => {
      const soldCount = soldBySessionId[s.id] ?? 0;
      return this.buildAdminSessionRow(
        {
          id: s.id,
          startsAt: s.startsAt,
          endsAt: s.endsAt ?? null,
          capacityTotal: s.capacityTotal ?? null,
          canceledAt: s.canceledAt,
          cancelReason: s.cancelReason,
          isActive: s.isActive,
        },
        {
          source: event.source,
          defaultCapacityTotal: event.defaultCapacityTotal ?? null,
        },
        soldCount,
      );
    });

    return {
      eventId,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      cancelledCount,
      rows,
    };
  }

  @Post(':id/sessions')
  @Roles('ADMIN', 'EDITOR')
  async createSession(@Param('id') eventId: string, @Body() dto: AdminCreateSessionDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, source: true, defaultCapacityTotal: true },
    });
    if (!event) {
      throw new NotFoundException('Событие не найдено');
    }
    if (event.source !== 'MANUAL') {
      throw new SessionLockedException('IMPORTED', 'Импортное событие: создание сеансов запрещено.');
    }

    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Invalid startsAt');
    }

    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.endsAt && Number.isNaN(endsAt!.getTime())) {
      throw new BadRequestException('Invalid endsAt');
    }

    const now = new Date();
    if (startsAt < now) {
      throw new SessionLockedException('PAST', 'Сеанс не может начинаться в прошлом.');
    }

    const capacity = dto.capacity ?? event.defaultCapacityTotal ?? null;

    const session = await this.prisma.eventSession.create({
      data: {
        eventId,
        startsAt,
        endsAt,
        capacityTotal: capacity,
        isActive: true,
        canceledAt: null,
        cancelReason: null,
        tcSessionId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prices: [],
      },
    });

    return this.buildAdminSessionRow(session, event, 0);
  }

  @Patch('/sessions/:sessionId')
  @Roles('ADMIN', 'EDITOR')
  async updateSession(@Param('sessionId') sessionId: string, @Body() dto: AdminUpdateSessionDto) {
    const { session, event } = await this.getSessionWithEvent(sessionId);
    const soldCount = await this.getSessionSoldCount(sessionId);
    this.assertSessionMutable(session, event, soldCount);

    const data: Prisma.EventSessionUpdateInput = {};

    if (dto.startsAt) {
      const startsAt = new Date(dto.startsAt);
      if (Number.isNaN(startsAt.getTime())) {
        throw new BadRequestException('Invalid startsAt');
      }
      data.startsAt = startsAt;
    }

    if (dto.endsAt !== undefined) {
      if (dto.endsAt === null) {
        data.endsAt = null;
      } else {
        const endsAt = new Date(dto.endsAt);
        if (Number.isNaN(endsAt.getTime())) {
          throw new BadRequestException('Invalid endsAt');
        }
        data.endsAt = endsAt;
      }
    }

    if (dto.capacity !== undefined) {
      if (dto.capacity !== null && dto.capacity < soldCount) {
        throw new SessionLockedException('SOLD', 'Нельзя уменьшить вместимость ниже количества проданных билетов.');
      }
      data.capacityTotal = dto.capacity;
    }

    const updated = await this.prisma.eventSession.update({
      where: { id: sessionId },
      data,
    });

    return this.buildAdminSessionRow(updated, event, soldCount);
  }

  @Post('/sessions/:sessionId/stop')
  @Roles('ADMIN', 'EDITOR')
  async stopSession(@Param('sessionId') sessionId: string, @Body() dto: AdminStopSessionDto) {
    const { session, event } = await this.getSessionWithEvent(sessionId);
    const soldCount = await this.getSessionSoldCount(sessionId);
    this.assertSessionMutable(session, event, soldCount);

    const now = new Date();
    const updated = await this.prisma.eventSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        canceledAt: now,
        cancelReason: dto.reason ?? null,
      },
    });

    return this.buildAdminSessionRow(updated, event, soldCount);
  }

  @Post('/sessions/:sessionId/cancel')
  @Roles('ADMIN', 'EDITOR')
  async cancelSession(@Param('sessionId') sessionId: string, @Body() dto: AdminCancelSessionDto) {
    const { session, event } = await this.getSessionWithEvent(sessionId);
    const soldCount = await this.getSessionSoldCount(sessionId);
    const now = new Date();

    if (event.source !== 'MANUAL') {
      throw new SessionLockedException('IMPORTED', 'Импортное событие: отмена сеансов запрещена.');
    }

    if (session.startsAt < now) {
      throw new SessionLockedException('PAST', 'Сеанс уже прошёл: отменить нельзя.');
    }

    if (soldCount > 0) {
      throw new SessionLockedException(
        'SOLD',
        'Есть продажи: отмена сеанса требует отдельной процедуры возвратов.',
      );
    }

    if (session.canceledAt) {
      // Идемпотентность: если уже отменён, просто возвращаем текущее состояние.
      return this.buildAdminSessionRow(session, event, soldCount);
    }

    const reason = dto.reason?.trim() || null;

    const result = await this.prisma.eventSession.updateMany({
      where: { id: sessionId, canceledAt: null },
      data: {
        isActive: false,
        canceledAt: now,
        cancelReason: reason,
      },
    });

    if (result.count === 0) {
      // Кто-то уже успел отменить в параллельной транзакции.
      return this.buildAdminSessionRow(session, event, soldCount);
    }

    const updated = await this.prisma.eventSession.findUniqueOrThrow({
      where: { id: sessionId },
    });

    return this.buildAdminSessionRow(updated, event, soldCount);
  }

  @Delete('/sessions/:sessionId')
  @Roles('ADMIN', 'EDITOR')
  async deleteSession(@Param('sessionId') sessionId: string) {
    const { session, event } = await this.getSessionWithEvent(sessionId);
    const soldCount = await this.getSessionSoldCount(sessionId);
    this.assertSessionMutable(session, event, soldCount);

    await this.prisma.eventSession.delete({ where: { id: sessionId } });
    return { ok: true };
  }

  /**
   * Опубликовать событие (через quality gate).
   *
   * POST /admin/events/:id/publish
   */
  @Post(':id/publish')
  @Roles('ADMIN')
  async publishEvent(@Param('id') eventId: string, @Request() req: { user: { id: string } }) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) {
      throw new NotFoundException('Событие не найдено');
    }

    const quality = await this.eventQuality.checkAndPersist(eventId);
    const gate = await this.publishGate.validateEventForPublish(eventId);
    if (gate.result === 'BLOCKING' || !quality.isReady) {
      return { ok: false, gate, issues: quality.issues } as { ok: false; gate: unknown; issues: EventQualityIssue[] };
    }

    await this.prisma.eventOverride.upsert({
      where: { eventId },
      create: {
        eventId,
        editorStatus: 'PUBLISHED',
        updatedBy: req.user.id,
        needsReviewAt: null,
      },
      update: {
        editorStatus: 'PUBLISHED',
        updatedBy: req.user.id,
        needsReviewAt: null,
      },
    });

    await this.audit.log(req.user.id, 'UPDATE', 'EventPublish', eventId, undefined, {
      editorStatus: 'PUBLISHED',
    });

    return { ok: true, issues: [], gate };
  }

  /**
   * Снять событие с публикации в каталоге (перевести editorStatus в NEEDS_REVIEW).
   *
   * POST /admin/events/:id/unpublish
   */
  @Post(':id/unpublish')
  @Roles('ADMIN')
  async unpublishEvent(@Param('id') eventId: string, @Request() req: { user: { id: string } }) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) {
      throw new NotFoundException('Событие не найдено');
    }

    await this.prisma.eventOverride.upsert({
      where: { eventId },
      create: {
        eventId,
        editorStatus: 'NEEDS_REVIEW',
        updatedBy: req.user.id,
        needsReviewAt: new Date(),
      },
      update: {
        editorStatus: 'NEEDS_REVIEW',
        updatedBy: req.user.id,
        needsReviewAt: new Date(),
      },
    });

    await this.audit.log(req.user.id, 'UPDATE', 'EventUnpublish', eventId, undefined, {
      editorStatus: 'NEEDS_REVIEW',
    });

    return { ok: true };
  }

  private async getSessionWithEvent(sessionId: string) {
    const session = await this.prisma.eventSession.findUnique({
      where: { id: sessionId },
      include: {
        event: { select: { id: true, source: true, defaultCapacityTotal: true } },
      },
    });
    if (!session) {
      throw new NotFoundException('Сеанс не найден');
    }
    return { session, event: session.event };
  }

  private async getSessionSoldCount(sessionId: string): Promise<number> {
    const sold = await this.prisma.packageItem.groupBy({
      by: ['sessionId'],
      where: {
        sessionId,
        status: { in: ['BOOKED', 'CONFIRMED'] },
      },
      _sum: {
        adultTickets: true,
        childTickets: true,
      },
    });
    if (!sold.length) return 0;
    const row = sold[0]!;
    return (row._sum.adultTickets ?? 0) + (row._sum.childTickets ?? 0);
  }

  private assertSessionMutable(
    session: { startsAt: Date; canceledAt: Date | null },
    event: { source: string },
    soldCount: number,
  ) {
    const now = new Date();

    if (event.source !== 'MANUAL') {
      throw new SessionLockedException('IMPORTED', 'Импортное событие: изменения расписания запрещены.');
    }

    if (session.canceledAt) {
      throw new SessionLockedException('OTHER', 'Сеанс уже отменён.');
    }

    if (session.startsAt < now) {
      throw new SessionLockedException('PAST', 'Сеанс уже прошёл: изменить или удалить нельзя.');
    }

    if (soldCount > 0) {
      throw new SessionLockedException('SOLD', 'Есть продажи: изменить или удалить сеанс нельзя.');
    }
  }

  private buildAdminSessionRow(
    session: {
      id: string;
      startsAt: Date;
      endsAt: Date | null;
      capacityTotal: number | null;
      canceledAt?: Date | null;
      cancelReason?: string | null;
      isActive?: boolean;
    },
    event: { source: string; defaultCapacityTotal: number | null },
    soldCount: number,
  ) {
    const now = new Date();
    let locked = false;
    let lockReason: 'SOLD' | 'PAST' | 'IMPORTED' | 'OTHER' | undefined;

    if (soldCount > 0) {
      locked = true;
      lockReason = 'SOLD';
    }
    if (session.startsAt < now) {
      locked = true;
      if (!lockReason) lockReason = 'PAST';
    }
    if (event.source !== 'MANUAL') {
      locked = true;
      if (!lockReason) lockReason = 'IMPORTED';
    }

    const capacity = session.capacityTotal ?? event.defaultCapacityTotal ?? null;
    const isCancelled = !!session.canceledAt;
    const canceledAt: Date | null = session.canceledAt ?? null;
    const cancelReason: string | null = session.cancelReason ?? null;
    const isActive = session.isActive !== false;

    return {
      id: session.id,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt?.toISOString() ?? null,
      capacity,
      soldCount,
      locked,
      lockReason,
      isCancelled,
      isActive,
      canceledAt: canceledAt ? canceledAt.toISOString() : null,
      cancelReason,
    };
  }

  /** Транслитерация заголовка в slug */
  private mapIssueSeverity(_issue: EventQualityIssue): 'BLOCKING' | 'WARNING' {
    // Текущее качество возвращает только блокирующие проблемы; предупреждения можно добавить позже.
    return 'BLOCKING';
  }

  private mapIssueTabKey(issue: EventQualityIssue): 'main' | 'location' | 'offers' | 'schedule' {
    const { code, field } = issue;

    // Явное маппинг по коду (важные кейсы)
    if (code === 'NO_FUTURE_SESSIONS' || code === 'END_DATE_PASSED') {
      return 'schedule';
    }
    if (code === 'MISSING_ACTIVE_OFFER' || code === 'NO_VALID_PRICE') {
      return 'offers';
    }

    // Маппинг по полю
    switch (field) {
      case 'title':
      case 'description':
      case 'imageUrl':
      case 'category':
        return 'main';
      case 'cityId':
      case 'location':
        return 'location';
      case 'offers':
        return 'offers';
      case 'sessions':
      case 'endDate':
        return 'schedule';
      default:
        return 'main';
    }
  }

  /** Транслитерация заголовка в slug */
  private transliterate(text: string): string {
    const map: Record<string, string> = {
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
    const now = new Date();
    const event = await this.prisma.event.findUniqueOrThrow({
      where: { id },
      include: {
        city: { select: { slug: true, name: true } },
        venue: { select: { id: true, title: true, slug: true } },
        operator: { select: { id: true, name: true, slug: true, trustLevel: true, trustScore: true } },
        sessions: { where: { isActive: true }, orderBy: { startsAt: 'asc' }, take: 20 },
        tags: { include: { tag: true } },
        offers: {
          orderBy: [{ isPrimary: 'desc' }, { priority: 'desc' }],
          include: {
            _count: { select: { sessions: true } },
            operator: { select: { id: true, name: true, slug: true, isActive: true } },
          },
        },
        override: true,
        subcategoryLinks: {
          include: {
            subcategory: { select: { id: true, slug: true, nameRu: true, isActive: true, layer: true, type: true } },
          },
        },
      },
    });

    const allSubcats = (event.subcategoryLinks ?? [])
      .map((l) => l.subcategory)
      .filter(
        (s): s is {
          id: string;
          slug: string;
          nameRu: string;
          isActive: boolean;
          layer: SubcategoryLayer;
          type: SubcategoryType;
        } => Boolean(s),
      );

    const lastSession = await this.prisma.eventSession.aggregate({
      where: { eventId: id },
      _max: { startsAt: true },
    });
    const lastSessionAt = (lastSession as unknown as { _max: { startsAt: Date | null } })._max.startsAt;
    const derivedIsPast = lastSessionAt ? lastSessionAt < now : false;
    const derivedIsArchived = isImportedArchived({ source: event.source, isActive: event.isActive });
    const derivedIsIndexable = !derivedIsPast && !derivedIsArchived;

    const futureWhere: Prisma.EventSessionWhereInput = {
      eventId: id,
      isActive: true,
      canceledAt: null,
      startsAt: { gt: now },
    };
    const [futureSessionsCount, nextFutureSession] = await Promise.all([
      this.prisma.eventSession.count({ where: futureWhere }),
      this.prisma.eventSession.findFirst({
        where: futureWhere,
        orderBy: { startsAt: 'asc' },
        select: { startsAt: true },
      }),
    ]);

    const effCover = event.override?.imageUrl ?? event.imageUrl;
    const categoryPrices = (event.offers ?? [])
      .filter((o) => !o.isDeleted)
      .map((o) => mapEventOfferToCategoryPriceDto(o));

    return {
      ...event,
      supplier: event.operator
        ? {
            id: event.operator.id,
            name: event.operator.name,
            slug: event.operator.slug,
            trustLevel: event.operator.trustLevel,
            trustScore: event.operator.trustScore,
          }
        : null,
      categoryPrices,
      scheduleSummary: {
        nextSessionAt: nextFutureSession?.startsAt.toISOString() ?? null,
        futureSessionsCount,
        importedSessionsReadOnly: event.source !== EventSource.MANUAL,
      },
      mediaSummary: {
        hasCover: Boolean(effCover),
        galleryCount: Array.isArray(event.galleryUrls) ? event.galleryUrls.length : 0,
      },
      subcategoriesCanonical: allSubcats.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.nameRu,
        isActive: s.isActive,
        layer: s.layer,
        subcategoryType: s.type,
      })),
      sectionsDerived: deriveSectionsFromSubcategories(allSubcats.map((s) => ({ slug: s.slug }))),
      lastSessionAt: lastSessionAt ? lastSessionAt.toISOString() : null,
      nextSessionAt: nextFutureSession?.startsAt.toISOString() ?? null,
      isPast: derivedIsPast,
      isArchived: derivedIsArchived,
      isIndexable: derivedIsIndexable,
    };
  }

  /**
   * Батч-создание сеансов для события.
   *
   * POST /admin/events/:id/sessions/batch-create
   */
  @Post(':id/sessions/batch-create')
  @Roles('ADMIN', 'EDITOR')
  async batchCreateSessions(
    @Param('id') eventId: string,
    @Body() dto: BatchCreateEventSessionsDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, source: true, defaultCapacityTotal: true },
    });
    if (!event) {
      throw new NotFoundException('Событие не найдено');
    }
    if (event.source !== 'MANUAL') {
      throw new SessionLockedException(
        'IMPORTED',
        'Импортное событие: батч-создание сеансов запрещено.',
      );
    }

    const slots = dto.slots ?? [];
    if (!slots.length) {
      throw new BadRequestException('Список слотов пуст');
    }
    if (slots.length > 200) {
      throw new BadRequestException('Нельзя создать более 200 слотов за один запрос');
    }

    const now = new Date();
    const normalized: {
      startsAt: Date;
      capacityTotal: number | null;
      isActive: boolean;
      startsAtIso: string;
    }[] = [];
    const skipped: { startsAt: string; reason: 'PAST' | 'INVALID' }[] = [];

    for (const slot of slots) {
      let startsAt: Date;
      try {
        startsAt = new Date(slot.startsAt);
        if (Number.isNaN(startsAt.getTime())) {
          throw new Error('invalid');
        }
      } catch {
        skipped.push({ startsAt: slot.startsAt, reason: 'INVALID' });
        continue;
      }

      if (startsAt < now) {
        skipped.push({ startsAt: startsAt.toISOString(), reason: 'PAST' });
        continue;
      }

      const capacityTotal =
        slot.capacityTotal != null
          ? slot.capacityTotal
          : event.defaultCapacityTotal != null
            ? event.defaultCapacityTotal
            : null;
      const isActive = slot.isActive ?? true;

      normalized.push({
        startsAt,
        capacityTotal,
        isActive,
        startsAtIso: startsAt.toISOString(),
      });
    }

    if (!normalized.length) {
      return {
        requested: slots.length,
        created: [] as ReturnType<typeof this.buildAdminSessionRow>[],
        skipped,
      };
    }

    // Проверяем существующие сеансы с теми же startsAt
    const existing = await this.prisma.eventSession.findMany({
      where: {
        eventId,
        startsAt: {
          in: normalized.map((n) => n.startsAt),
        },
      },
      select: { startsAt: true },
    });
    const existingSet = new Set(existing.map((s) => s.startsAt.toISOString()));

    const toCreate = normalized.filter((n) => !existingSet.has(n.startsAtIso));

    const duplicateSkipped = normalized
      .filter((n) => existingSet.has(n.startsAtIso))
      .map((n) => ({
        startsAt: n.startsAtIso,
        reason: 'DUPLICATE' as const,
      }));

    const createdSessions = await this.prisma.$transaction(async (tx) => {
      const created: {
        id: string;
        startsAt: Date;
        endsAt: Date | null;
        capacityTotal: number | null;
        canceledAt: Date | null;
        cancelReason: string | null;
        isActive: boolean;
      }[] = [];

      for (const n of toCreate) {
        const session = await tx.eventSession.create({
          data: {
            eventId,
            startsAt: n.startsAt,
            endsAt: null,
            capacityTotal: n.capacityTotal,
            isActive: n.isActive,
            canceledAt: null,
            cancelReason: null,
            tcSessionId: `manual-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            prices: [],
          },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            capacityTotal: true,
            canceledAt: true,
            cancelReason: true,
            isActive: true,
          },
        });
        created.push(session);
      }

      return created;
    });

    const createdRows = createdSessions.map((s) =>
      this.buildAdminSessionRow(
        {
          id: s.id,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          capacityTotal: s.capacityTotal,
          canceledAt: s.canceledAt,
          cancelReason: s.cancelReason,
          isActive: s.isActive,
        },
        {
          source: event.source,
          defaultCapacityTotal: event.defaultCapacityTotal ?? null,
        },
        0,
      ),
    );

    return {
      requested: slots.length,
      created: createdRows,
      skipped: [...skipped, ...duplicateSkipped],
    };
  }
  // --- Override endpoints ---

  /**
   * Создать/обновить override для события.
   */
  @Patch(':id/override')
  @Roles('ADMIN', 'EDITOR')
  async upsertOverride(@Param('id') id: string, @Body() data: OverrideEventDto, @Request() req: { user: { id: string } }) {
    const dataAny = data as Record<string, unknown>;
    if (dataAny.manualBoost !== undefined) {
      const before = await this.prisma.eventOverride.findUnique({
        where: { eventId: id },
        select: { manualBoost: true },
      });
      const result = await this.overrideService.upsert(id, data as unknown as Record<string, unknown>, req.user.id);
      await this.cacheInvalidation.invalidateOverride(id);
      const afterVal = (result as { manualBoost?: number | null })?.manualBoost;
      if (before?.manualBoost !== afterVal) {
        await this.audit.log(
          req.user.id,
          'UPDATE',
          'EventOverride.manualBoost',
          id,
          before ? { manualBoost: before.manualBoost } : null,
          { manualBoost: afterVal ?? null },
        );
      }
      return result;
    }
    const result = await this.overrideService.upsert(id, data as unknown as Record<string, unknown>, req.user.id);
    await this.cacheInvalidation.invalidateOverride(id);
    return result;
  }

  /**
   * Обложка (override.imageUrl) и галерея (event.galleryUrls).
   *
   * PATCH /admin/events/:id/media
   */
  @Patch(':id/media')
  @Roles('ADMIN', 'EDITOR')
  async patchEventMedia(
    @Param('id') id: string,
    @Body() body: PatchEventMediaDto,
    @Request() req: { user: { id: string } },
  ) {
    const event = await this.prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!event) throw new NotFoundException('Событие не найдено');

    if (body.galleryUrls !== undefined) {
      await this.prisma.event.update({
        where: { id },
        data: { galleryUrls: body.galleryUrls },
      });
    }

    if (body.imageUrl !== undefined) {
      const normalized = body.imageUrl.trim() === '' ? null : body.imageUrl.trim();
      await this.overrideService.upsert(id, { imageUrl: normalized } as unknown as Record<string, unknown>, req.user.id);
      await this.cacheInvalidation.invalidateOverride(id);
    }

    await this.cacheInvalidation.invalidateEventById(id);
    return { ok: true };
  }

  /**
   * Удалить override — вернуть к данным из sync.
   */
  @Delete(':id/override')
  @Roles('ADMIN', 'EDITOR')
  async deleteOverride(@Param('id') id: string) {
    const result = await this.overrideService.remove(id);
    await this.cacheInvalidation.invalidateOverride(id);
    return result || { message: 'Override не найден' };
  }

  /**
   * Toggle скрытия события.
   */
  @Patch(':id/hide')
  @Roles('ADMIN', 'EDITOR')
  async toggleHide(@Param('id') id: string, @Body('isHidden') isHidden: boolean, @Request() req: { user: { id: string } }) {
    const result = await this.overrideService.toggleHidden(id, isHidden, req.user.id);
    await this.cacheInvalidation.invalidateOverride(id);
    return result;
  }

  /**
   * Archive/unarchive event for admin UX (non-destructive).
   *
   * Policy:
   * - Archived events are excluded from default admin list.
   * - Record remains доступна по прямому URL.
   */
  @Patch(':id/archive')
  @Roles('ADMIN', 'EDITOR')
  async setArchived(@Param('id') id: string, @Body('isArchived') isArchived: boolean) {
    const event = await this.prisma.event.findUnique({ where: { id }, select: { id: true, source: true, isActive: true } });
    if (!event) throw new NotFoundException('Событие не найдено');

    // Legacy schema: treat "archived" as imported inactive (source != MANUAL && isActive=false).
    // Unarchive toggles isActive=true (safe: does not auto-publish anything; visibility is controlled elsewhere).
    if (event.source === EventSource.MANUAL) {
      throw new BadRequestException('Архивирование доступно только для импортных событий');
    }
    const updated = await this.prisma.event.update({
      where: { id },
      data: { isActive: isArchived ? false : true },
      select: { id: true, isActive: true, updatedAt: true },
    });

    await this.cacheInvalidation.invalidateEventById(id);
    return updated;
  }

  /**
   * GET /admin/events/:id/tags
   * Теги события с разделением логики STRUCTURAL/POPULAR.
   */
  @Get(':id/tags')
  @Roles('ADMIN', 'EDITOR')
  async getEventTags(@Param('id') id: string) {
    const links = await this.prisma.eventTag.findMany({
      where: {
        eventId: id,
        tag: {
          tagKind: {
            in: [TagKind.STRUCTURAL, TagKind.POPULAR],
          },
        },
      },
      include: { tag: true },
    });
    return links.map((l) => l.tag);
  }

  @Get(':id/subcategories')
  @Roles('ADMIN', 'EDITOR')
  async getEventSubcategories(@Param('id') id: string) {
    const eventExists = await this.prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!eventExists) throw new NotFoundException('Событие не найдено');

    const links = await this.prisma.eventSubcategoryLink.findMany({
      where: { eventId: id },
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
      /** @deprecated плоский список для старых клиентов */
      all: links.map((l) => l.subcategory),
    };
  }

  @Post(':id/subcategories')
  @Roles('ADMIN', 'EDITOR')
  async assignEventSubcategoriesPost(@Param('id') id: string, @Body() dto: AssignEventSubcategoriesDto) {
    const eventExists = await this.prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!eventExists) throw new NotFoundException('Событие не найдено');

    await this.prisma.$transaction((tx) =>
      this.subcategoryAssignment.assignEventSubcategories(id, dto.primaryCode, dto.secondaryCodes ?? [], tx),
    );

    await this.cacheInvalidation.invalidateEventById(id);
    return this.getEventSubcategories(id);
  }

  /**
   * @deprecated Используйте POST .../subcategories с primaryCode + secondaryCodes. Не пишет legacy Event.subcategories.
   */
  @Put(':id/subcategories')
  @Roles('ADMIN', 'EDITOR')
  async setEventSubcategories(@Param('id') id: string, @Body() dto: UpdateEventSubcategoriesDto) {
    const eventExists = await this.prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!eventExists) throw new NotFoundException('Событие не найдено');

    await this.prisma.$transaction(async (tx) => {
      const rows = await this.catalogClassificationNormalizer.resolveActiveEventSubcategories(
        dto.subcategoryIds,
        dto.subcategorySlugs,
        tx,
      );
      await tx.eventSubcategoryLink.deleteMany({ where: { eventId: id } });
      if (rows.length) {
        await tx.eventSubcategoryLink.createMany({
          data: rows.map((row) => ({ eventId: id, subcategoryId: row.id })),
          skipDuplicates: true,
        });
      }
    });

    await this.cacheInvalidation.invalidateEventById(id);
    return this.getEventSubcategories(id);
  }

  /**
   * PUT /admin/events/:id/tags
   * Задает слои STRUCTURAL и POPULAR (теги по slug).
   */
  @Put(':id/tags')
  @Roles('ADMIN', 'EDITOR')
  async setEventTags(
    @Param('id') id: string,
    @Body() dto: UpdateEventTagsDto,
    @Request() req: { user: { id: string } },
  ) {
    const hasStructural = dto.structuralTags !== undefined;
    const hasPopular = dto.popularTags !== undefined;
    if (!hasStructural && !hasPopular) {
      throw new BadRequestException('Необходимо передать structuralTags и/или popularTags');
    }

    const structuralSlugsUnique = Array.from(new Set(dto.structuralTags ?? []));
    const popularSlugsUnique = Array.from(new Set(dto.popularTags ?? []));

    const eventExists = await this.prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!eventExists) throw new NotFoundException('Событие не найдено');

    const structuralRows = structuralSlugsUnique.length
      ? await this.prisma.tag.findMany({
          where: {
            slug: { in: structuralSlugsUnique },
            tagKind: TagKind.STRUCTURAL,
            isActive: true,
            structuralGroup: { not: null },
          },
          select: { id: true, slug: true, tagKind: true, structuralGroup: true },
        })
      : [];

    if (structuralRows.length !== structuralSlugsUnique.length) {
      throw new BadRequestException('Некоторые structuralTags не найдены/неактивны');
    }

    const popularRows = popularSlugsUnique.length
      ? await this.prisma.tag.findMany({
          where: {
            slug: { in: popularSlugsUnique },
            tagKind: TagKind.POPULAR,
            isActive: true,
          },
          select: { id: true, slug: true, tagKind: true, structuralGroup: true },
        })
      : [];

    if (popularRows.length !== popularSlugsUnique.length) {
      throw new BadRequestException('Некоторые popularTags не найдены/неактивны');
    }

    this.eventTagRules.assertStructuralTagLimits(
      structuralRows.map((r) => ({ id: r.id, tagKind: r.tagKind, structuralGroup: r.structuralGroup })),
    );
    this.eventTagRules.assertPopularTagWhitelist(
      popularRows.map((r) => ({ id: r.id, tagKind: r.tagKind, structuralGroup: r.structuralGroup })),
    );

    // Удаляем только текущие слои STRUCTURAL/POPULAR, не трогая остальные legacy-связи.
    await this.prisma.eventTag.deleteMany({
      where: {
        eventId: id,
        tag: {
          tagKind: { in: [TagKind.STRUCTURAL, TagKind.POPULAR] },
        },
      },
    });

    const assignedBy = req.user.id;
    const newTagIds = [...structuralRows, ...popularRows].map((t) => t.id);
    if (newTagIds.length > 0) {
      await this.prisma.eventTag.createMany({
        data: newTagIds.map((tagId) => ({
          eventId: id,
          tagId,
          assignedBy,
          assignmentSource: EventTagAssignmentSource.MANUAL_ADMIN,
        })),
        skipDuplicates: true,
      });
    }

    await this.cacheInvalidation.invalidateEventById(id);

    const links = await this.prisma.eventTag.findMany({
      where: { eventId: id },
      include: { tag: true },
    });
    return links.map((l) => l.tag);
  }

  /**
   * Быстрое включение/выключение события в каталоге.
   *
   * PATCH /admin/events/:id/activation
   */
  @Patch(':id/activation')
  @Roles('ADMIN', 'EDITOR')
  async updateActivation(@Param('id') id: string, @Body() body: EventActivationDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Событие не найдено');
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: { isActive: body.isActive },
      select: { id: true, isActive: true },
    });

    await this.cacheInvalidation.invalidateEventById(id);

    return updated;
  }

  /**
   * Массовое обновление событий (статус, категория, soft-delete).
   *
   * PATCH /admin/events/bulk-update
   */
  @Patch('bulk-update')
  @Roles('ADMIN', 'EDITOR')
  async bulkUpdateEvents(@Body() body: BulkUpdateEventsDto) {
    const { ids, category, isActive, softDelete } = body;

    if (!ids || ids.length === 0) {
      throw new BadRequestException('Список ids не может быть пустым');
    }

    const data: Prisma.EventUpdateManyMutationInput = {};

    if (category !== undefined) {
      data.category = category as EventCategory;
    }

    if (isActive !== undefined) {
      data.isActive = isActive;
    }

    if (softDelete) {
      data.isDeleted = true;
      data.deletedAt = new Date();
      data.isActive = false;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Нет полей для обновления');
    }

    await this.prisma.event.updateMany({
      where: {
        id: { in: ids },
        isDeleted: false,
      },
      data,
    });

    await Promise.all(ids.map((id) => this.cacheInvalidation.invalidateEventById(id)));

    return { ok: true };
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

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...(data.venueId !== undefined && { venueId: data.venueId || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.dateMode && { dateMode: data.dateMode as DateMode }),
        ...(data.isPermanent !== undefined && { isPermanent: data.isPermanent }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
      },
      select: {
        id: true,
        venueId: true,
        address: true,
        dateMode: true,
        isPermanent: true,
        endDate: true,
      },
    });
    await this.cacheInvalidation.invalidateEventById(id);
    return updated;
  }

  /**
   * Узкие фасеты для лендингов с таблицей сравнения (речные / гастро-круизы).
   * PATCH /admin/events/:id/landing-table-facets
   */
  @Patch(':id/landing-table-facets')
  @Roles('ADMIN', 'EDITOR')
  async updateLandingTableFacets(@Param('id') id: string, @Body() data: EventLandingTableFacetsDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Событие не найдено');

    const riverLink = await this.prisma.eventSubcategoryLink.findFirst({
      where: { eventId: id, subcategory: { slug: 'river-excursion' } },
      select: { eventId: true },
    });
    if (!riverLink) {
      throw new BadRequestException(
        'Фасеты таблицы лендинга (теплоход, меню, формат) доступны только для событий с подкатегорией «Речные прогулки» (river-excursion).',
      );
    }

    const norm = (s: string | null | undefined) => {
      if (s === undefined) return undefined;
      if (s === null) return null;
      const t = String(s).trim();
      return t === '' ? null : t;
    };

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...(data.vesselName !== undefined && { vesselName: norm(data.vesselName) }),
        ...(data.experienceFormat !== undefined && { experienceFormat: norm(data.experienceFormat) }),
      },
      select: {
        id: true,
        vesselName: true,
        experienceFormat: true,
      },
    });
    await this.cacheInvalidation.invalidateEventById(id);
    return updated;
  }

  /**
   * Питание (тип, включено ли в стоимость, меню) — хранится в override.contentTemplateData.catering.
   * PATCH /admin/events/:id/catering
   */
  @Patch(':id/catering')
  @Roles('ADMIN', 'EDITOR')
  async updateCatering(
    @Param('id') id: string,
    @Body() data: EventCateringDto,
    @Request() req: { user: { id: string } },
  ) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Событие не найдено');

    const riverLink = await this.prisma.eventSubcategoryLink.findFirst({
      where: { eventId: id, subcategory: { slug: 'river-excursion' } },
      select: { eventId: true },
    });
    if (!riverLink) {
      throw new BadRequestException(
        'Блок «Питание» доступен только для событий с подкатегорией «Речные прогулки» (river-excursion).',
      );
    }

    const prev = await this.prisma.eventOverride.findUnique({
      where: { eventId: id },
      select: { contentTemplateData: true },
    });
    const prevCtd =
      prev?.contentTemplateData && typeof prev.contentTemplateData === 'object'
        ? (prev.contentTemplateData as Record<string, unknown>)
        : {};

    const normStr = (s: string | null | undefined) => {
      if (s === undefined) return undefined;
      if (s === null) return null;
      const t = String(s).trim();
      return t === '' ? null : t;
    };

    const nextCatering: Record<string, unknown> = {
      ...(typeof prevCtd.catering === 'object' && prevCtd.catering != null
        ? (prevCtd.catering as Record<string, unknown>)
        : {}),
      ...(data.enabled !== undefined && { enabled: Boolean(data.enabled) }),
      ...(data.type !== undefined && { type: normStr(data.type) }),
      ...(data.includedInPrice !== undefined && { includedInPrice: data.includedInPrice }),
      ...(data.menuMarkdown !== undefined && { menuMarkdown: normStr(data.menuMarkdown) }),
    };

    const updated = await this.prisma.eventOverride.upsert({
      where: { eventId: id },
      create: {
        eventId: id,
        updatedBy: req.user.id,
        contentTemplateData: { ...prevCtd, catering: nextCatering } as Prisma.InputJsonValue,
      },
      update: {
        updatedBy: req.user.id,
        contentTemplateData: { ...prevCtd, catering: nextCatering } as Prisma.InputJsonValue,
      },
      select: { eventId: true, contentTemplateData: true },
    });

    await this.cacheInvalidation.invalidateEventById(id);
    return { ok: true, override: updated };
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

    await this.cacheInvalidation.invalidateEventById(id);
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
        operator: { select: { id: true, name: true, slug: true, isActive: true } },
      },
    });
  }

  /**
   * Ticket provider: ссылки на внешнее событие + диагностика маршрутизации (B2B foundation).
   */
  @Get(':id/providers')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async getTicketProviderContext(@Param('id') id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        source: true,
        defaultProvider: true,
        providerLinks: { orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }] },
      },
    });
    if (!event) throw new NotFoundException('Событие не найдено');
    const routing = await this.providerRouting.resolveProviderDebug(id);
    const descriptor = this.providerRegistry.getDescriptor(routing.provider);
    return {
      event,
      routing,
      resolvedDescriptor: {
        code: descriptor.code,
        protocolType: descriptor.protocolType,
        operationalClass: descriptor.operationalClass,
        authType: descriptor.authType,
        capabilities: descriptor.capabilities,
      },
    };
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

    await this.cacheInvalidation.invalidateEventById(eventId);
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

    await this.cacheInvalidation.invalidateEventById(eventId);
    return updated;
  }

  /**
   * Частичное обновление оффера (статус, primary, priority, комиссия).
   */
  @Patch(':id/offers/:offerId')
  @Roles('ADMIN', 'EDITOR')
  async updateOffer(@Param('id') eventId: string, @Param('offerId') offerId: string, @Body() data: PatchEventOfferDto) {
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
  async deleteOffer(@Param('id') eventId: string, @Param('offerId') offerId: string) {
    const offer = await this.prisma.eventOffer.findFirst({
      where: { id: offerId, eventId },
    });
    if (!offer) throw new NotFoundException('Оффер не найден');

    if (offer.source !== 'MANUAL') {
      throw new BadRequestException(
        'Удалять можно только MANUAL-офферы. Синхронизированные офферы скрывайте через статус DISABLED.',
      );
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
  async cloneOffer(@Param('id') eventId: string, @Param('offerId') offerId: string) {
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

class SessionLockedException extends ConflictException {
  constructor(
    public readonly reason: 'SOLD' | 'PAST' | 'IMPORTED' | 'OTHER',
    message: string,
  ) {
    super({
      code: 'SESSION_LOCKED',
      reason,
      message,
    });
  }
}
