import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';
import { CollectionStatus, LandingStatus, PromoBlockStatus, PromoPageScopeType, PromoTargetType } from '@/prisma-client';
import type {
  AdminPromoPlacementBlocksQueryDto,
  AdminPromoPlacementResolvedPreviewQueryDto,
  CreatePromoPlacementBlockDto,
  UpdatePromoPlacementBlockDto,
} from './dto/admin-promo-placement-block.dto';

function isActiveNow(status: PromoBlockStatus, startsAt: Date | null, endsAt: Date | null, now: Date): boolean {
  if (status !== PromoBlockStatus.PUBLISHED) return false;
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}

type ReadinessStatus = 'READY' | 'EMPTY' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE' | 'MISCONFIGURED';
type ReadinessReason =
  | 'NO_SCOPE_MATCH'
  | 'WINDOW_NOT_STARTED'
  | 'WINDOW_EXPIRED'
  | 'NOT_PUBLISHED'
  | 'NO_TARGET'
  | 'UNSUPPORTED_CONTEXT'
  | 'NO_RESOLVED_CONTENT'
  | 'CONFLICT_MULTIPLE_ACTIVE'
  | 'OUTRANKED';

type Readiness = { readinessStatus: ReadinessStatus; readinessReasons: ReadinessReason[] };
type SeoSignals = { targetHasSeoIssues: boolean; seoIssueCodes: string[] };

type ComparisonOutcome = 'WINNER' | 'OUTRANKED' | 'INACTIVE' | 'NOT_ELIGIBLE';
type ComparisonReason =
  | 'LOWER_PRIORITY'
  | 'HIGHER_SORT_ORDER'
  | 'OLDER_UPDATED_AT_TIEBREAKER'
  | 'NOT_PUBLISHED'
  | 'WINDOW_NOT_STARTED'
  | 'WINDOW_EXPIRED'
  | 'SCOPE_MISMATCH';

type ComparisonToWinner = { outcome: ComparisonOutcome; reasons: ComparisonReason[] };
type RankExplanation = { primaryOrderingFactor: 'PRIORITY' | 'SORT_ORDER' | 'UPDATED_AT' };

function uniqReasons<T extends string>(r: T[]): T[] {
  return Array.from(new Set(r));
}

@Injectable()
export class AdminPromoPlacementBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminPromoPlacementBlocksQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Prisma.PromoPlacementBlockWhereInput = {};
    const now = new Date();

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [{ title: { contains: s, mode: 'insensitive' } }, { customTitle: { contains: s, mode: 'insensitive' } }];
    }
    if (query.status) where.status = query.status;
    if (query.placementZone) where.placementZone = query.placementZone;
    if (query.pageScopeType) where.pageScopeType = query.pageScopeType;
    if (query.cityId) where.cityId = query.cityId;
    if (query.landingId) where.landingId = query.landingId;
    if (query.collectionId) where.collectionId = query.collectionId;
    if (query.articleId) where.articleId = query.articleId;
    if (query.targetType) where.targetType = query.targetType;

    if (query.seoOnly === '1') {
      // Operator convenience filter: SEO issues only (diagnostics).
      // SQL-safe, minimal, and intentionally scoped to EVENT targets for now.
      // NOTE: WEAK_DESC (length-based) is not included here intentionally to keep DB filtering reliable.
      const prevAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [
        ...prevAnd,
        {
          targetType: PromoTargetType.EVENT,
          targetEventId: { not: null },
          targetEvent: {
            isDeleted: false,
            OR: [
              // NO_PHOTO
              { imageUrl: null, OR: [{ override: null }, { override: { imageUrl: null } }] },
              // NO_PRICE
              {
                NOT: {
                  offers: { some: { isDeleted: false, status: 'ACTIVE', priceFrom: { gt: 0 } } },
                },
              },
              // NO_SESSIONS (active event without future sessions)
              {
                isActive: true,
                NOT: { sessions: { some: { isActive: true, canceledAt: null, startsAt: { gt: now } } } },
              },
            ],
          },
        },
      ];
    }

    // Operator-facing readiness filter.
    // Implemented via SQL-safe predicates (no post-filter) to keep pagination consistent.
    if (query.readiness) {
      const scopeComplete: Prisma.PromoPlacementBlockWhereInput = {
        OR: [
          {
            pageScopeType: PromoPageScopeType.GLOBAL,
            cityId: null,
            landingId: null,
            collectionId: null,
            articleId: null,
          },
          { pageScopeType: PromoPageScopeType.CITY, cityId: { not: null } },
          { pageScopeType: PromoPageScopeType.LANDING, landingId: { not: null } },
          { pageScopeType: PromoPageScopeType.COLLECTION, collectionId: { not: null } },
          { pageScopeType: PromoPageScopeType.ARTICLE, articleId: { not: null } },
        ],
      };

      const targetConfigured: Prisma.PromoPlacementBlockWhereInput = {
        OR: [
          { targetType: PromoTargetType.EVENT, targetEventId: { not: null } },
          { targetType: PromoTargetType.COLLECTION, targetCollectionId: { not: null } },
          { targetType: PromoTargetType.LANDING, targetLandingId: { not: null } },
          { targetType: PromoTargetType.ARTICLE, targetArticleId: { not: null } },
        ],
      };

      const targetPublishable: Prisma.PromoPlacementBlockWhereInput = {
        OR: [
          {
            targetType: PromoTargetType.EVENT,
            targetEventId: { not: null },
            targetEvent: { isDeleted: false, isActive: true },
          },
          {
            targetType: PromoTargetType.COLLECTION,
            targetCollectionId: { not: null },
            // CollectionStatus does not have PUBLISHED; ACTIVE is the publishable state.
            targetCollection: { isDeleted: false, isActive: true, status: CollectionStatus.ACTIVE },
          },
          {
            targetType: PromoTargetType.LANDING,
            targetLandingId: { not: null },
            // LandingStatus does not have PUBLISHED; ACTIVE is the publishable state.
            targetLanding: { isDeleted: false, isActive: true, status: LandingStatus.ACTIVE },
          },
          {
            targetType: PromoTargetType.ARTICLE,
            targetArticleId: { not: null },
            targetArticle: { status: 'PUBLISHED', publishedAt: { not: null } },
          },
        ],
      };

      const windowActive: Prisma.PromoPlacementBlockWhereInput = {
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      };

      const windowScheduled: Prisma.PromoPlacementBlockWhereInput = {
        startsAt: { not: null, gt: now },
      };

      const windowExpired: Prisma.PromoPlacementBlockWhereInput = {
        endsAt: { not: null, lt: now },
      };

      const misconfigured: Prisma.PromoPlacementBlockWhereInput = {
        OR: [
          // Missing scope IDs for a non-global scope
          { pageScopeType: PromoPageScopeType.CITY, cityId: null },
          { pageScopeType: PromoPageScopeType.LANDING, landingId: null },
          { pageScopeType: PromoPageScopeType.COLLECTION, collectionId: null },
          { pageScopeType: PromoPageScopeType.ARTICLE, articleId: null },
          // Missing target IDs
          { targetType: PromoTargetType.EVENT, targetEventId: null },
          { targetType: PromoTargetType.COLLECTION, targetCollectionId: null },
          { targetType: PromoTargetType.LANDING, targetLandingId: null },
          { targetType: PromoTargetType.ARTICLE, targetArticleId: null },
        ],
      };

      const empty: Prisma.PromoPlacementBlockWhereInput = {
        AND: [
          targetConfigured,
          {
            OR: [
              { targetType: PromoTargetType.EVENT, targetEvent: { OR: [{ isDeleted: true }, { isActive: false }] } },
              {
                targetType: PromoTargetType.COLLECTION,
                targetCollection: { OR: [{ isDeleted: true }, { isActive: false }, { status: { not: CollectionStatus.ACTIVE } }] },
              },
              {
                targetType: PromoTargetType.LANDING,
                targetLanding: { OR: [{ isDeleted: true }, { isActive: false }, { status: { not: LandingStatus.ACTIVE } }] },
              },
              { targetType: PromoTargetType.ARTICLE, targetArticle: { OR: [{ status: { not: 'PUBLISHED' } }, { publishedAt: null }] } },
            ],
          },
        ],
      };

      const readinessWhere: Prisma.PromoPlacementBlockWhereInput =
        query.readiness === 'INACTIVE'
          ? { status: { not: PromoBlockStatus.PUBLISHED } }
          : query.readiness === 'SCHEDULED'
            ? { status: PromoBlockStatus.PUBLISHED, ...windowScheduled }
            : query.readiness === 'EXPIRED'
              ? { status: PromoBlockStatus.PUBLISHED, ...windowExpired }
              : query.readiness === 'MISCONFIGURED'
                ? misconfigured
                : query.readiness === 'EMPTY'
                  ? empty
                  : // READY
                    { status: PromoBlockStatus.PUBLISHED, ...windowActive, AND: [scopeComplete, targetConfigured, targetPublishable] };

      const prevAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...prevAnd, readinessWhere];
    }

    const sortField = query.sort ?? 'updatedAt';
    const order: Prisma.SortOrder = query.order ?? 'desc';
    const orderBy: Prisma.PromoPlacementBlockOrderByWithRelationInput[] =
      sortField === 'priority'
        ? [{ priority: order }, { sortOrder: 'asc' }, { updatedAt: 'desc' }]
        : sortField === 'sortOrder'
          ? [{ sortOrder: order }, { priority: 'desc' }, { updatedAt: 'desc' }]
          : sortField === 'publishedAt'
            ? [{ publishedAt: order }, { updatedAt: 'desc' }]
            : sortField === 'title'
              ? [{ title: order }, { updatedAt: 'desc' }]
              : [{ updatedAt: order }];

    const [total, rows] = await Promise.all([
      this.prisma.promoPlacementBlock.count({ where }),
      this.prisma.promoPlacementBlock.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          city: { select: { id: true, name: true, slug: true } },
          landing: { select: { id: true, title: true, slug: true, city: { select: { slug: true, name: true } } } },
          collection: { select: { id: true, title: true, slug: true } },
          article: { select: { id: true, title: true, slug: true } },
          targetEvent: { select: { id: true, title: true, slug: true, isActive: true, isDeleted: true } },
          targetCollection: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true } },
          targetLanding: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true, city: { select: { slug: true, name: true } } } },
          targetArticle: { select: { id: true, title: true, slug: true, status: true, publishedAt: true } },
        },
      }),
    ]);

    const seoByEventId = await this.computeEventSeoSignals(
      rows
        .filter((r) => r.targetType === PromoTargetType.EVENT && r.targetEventId)
        .map((r) => r.targetEventId!),
    );

    return {
      page,
      limit,
      total,
      items: rows.map((r) =>
        this.toListItem(r, r.targetType === PromoTargetType.EVENT && r.targetEventId ? seoByEventId.get(r.targetEventId) : undefined),
      ),
    };
  }

  async getById(id: string) {
    const row = await this.prisma.promoPlacementBlock.findUnique({
      where: { id },
      include: {
        city: { select: { id: true, name: true, slug: true } },
        landing: { select: { id: true, title: true, slug: true, city: { select: { id: true, slug: true, name: true } } } },
        collection: { select: { id: true, title: true, slug: true } },
        article: { select: { id: true, title: true, slug: true } },
        targetEvent: { select: { id: true, title: true, slug: true, isActive: true, isDeleted: true } },
        targetCollection: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true } },
        targetLanding: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true, city: { select: { slug: true, name: true } } } },
        targetArticle: { select: { id: true, title: true, slug: true, status: true, publishedAt: true } },
      },
    });
    if (!row) throw new NotFoundException('Promo block not found');

    const seo =
      row.targetType === PromoTargetType.EVENT && row.targetEventId
        ? (await this.computeEventSeoSignals([row.targetEventId])).get(row.targetEventId)
        : undefined;

    return this.toDetail(row, seo);
  }

  async resolvedPreview(id: string, query: AdminPromoPlacementResolvedPreviewQueryDto) {
    const row = await this.prisma.promoPlacementBlock.findUnique({
      where: { id },
      include: {
        city: { select: { id: true, name: true, slug: true } },
        landing: { select: { id: true, title: true, slug: true, city: { select: { id: true, slug: true, name: true } } } },
        collection: { select: { id: true, title: true, slug: true } },
        article: { select: { id: true, title: true, slug: true } },
        targetEvent: { select: { id: true, title: true, slug: true, isActive: true, isDeleted: true } },
        targetCollection: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true } },
        targetLanding: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true, city: { select: { slug: true, name: true } } } },
        targetArticle: { select: { id: true, title: true, slug: true, status: true, publishedAt: true } },
      },
    });
    if (!row) throw new NotFoundException('Promo block not found');

    const now = new Date();
    const base = this.computeReadiness(row, now);

    const ctx = {
      pageScopeType: query.pageScopeType,
      cityId: query.cityId ?? null,
      landingId: query.landingId ?? null,
      collectionId: query.collectionId ?? null,
      articleId: query.articleId ?? null,
    };

    const reasons: ReadinessReason[] = [...base.readinessReasons];

    const ctxComplete =
      ctx.pageScopeType === PromoPageScopeType.GLOBAL
        ? true
        : ctx.pageScopeType === PromoPageScopeType.CITY
          ? Boolean(ctx.cityId)
          : ctx.pageScopeType === PromoPageScopeType.LANDING
            ? Boolean(ctx.landingId)
            : ctx.pageScopeType === PromoPageScopeType.COLLECTION
              ? Boolean(ctx.collectionId)
              : Boolean(ctx.articleId);

    if (!ctxComplete) reasons.push('UNSUPPORTED_CONTEXT');

    const scopeMatch =
      row.pageScopeType === ctx.pageScopeType &&
      (ctx.pageScopeType === PromoPageScopeType.GLOBAL
        ? true
        : ctx.pageScopeType === PromoPageScopeType.CITY
          ? row.cityId === ctx.cityId
          : ctx.pageScopeType === PromoPageScopeType.LANDING
            ? row.landingId === ctx.landingId
            : ctx.pageScopeType === PromoPageScopeType.COLLECTION
              ? row.collectionId === ctx.collectionId
              : row.articleId === ctx.articleId);

    if (!scopeMatch) reasons.push('NO_SCOPE_MATCH');

    const limit = Math.min(50, Math.max(1, query.limit ?? 10));
    let resolvedTop: ReturnType<typeof this.toResolvedPreviewItem>[] = [];
    let resolvedAll: ReturnType<typeof this.toResolvedPreviewItem>[] = [];
    let selected = false;
    let rank: number | null = null;
    let activeShown = 0;
    let activeTotal = 0;
    let activeTruncated = false;
    let winnerId: string | null = null;
    let comparisonToWinner: ComparisonToWinner | null = null;

    if (ctxComplete) {
      const where: Prisma.PromoPlacementBlockWhereInput = {
        placementZone: row.placementZone,
        pageScopeType: ctx.pageScopeType,
        status: PromoBlockStatus.PUBLISHED,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      };
      if (ctx.pageScopeType === PromoPageScopeType.GLOBAL) {
        where.cityId = null;
        where.landingId = null;
        where.collectionId = null;
        where.articleId = null;
      }
      if (ctx.pageScopeType === PromoPageScopeType.CITY) where.cityId = ctx.cityId!;
      if (ctx.pageScopeType === PromoPageScopeType.LANDING) where.landingId = ctx.landingId!;
      if (ctx.pageScopeType === PromoPageScopeType.COLLECTION) where.collectionId = ctx.collectionId!;
      if (ctx.pageScopeType === PromoPageScopeType.ARTICLE) where.articleId = ctx.articleId!;

      const [rowsTop, totalActive] = await Promise.all([
        this.prisma.promoPlacementBlock.findMany({
          where,
          orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
          take: limit,
          include: {
            targetEvent: { select: { id: true, title: true, slug: true, isActive: true, isDeleted: true } },
            targetCollection: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true } },
            targetLanding: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true, city: { select: { slug: true } } } },
            targetArticle: { select: { id: true, title: true, slug: true, status: true, publishedAt: true } },
          },
        }),
        this.prisma.promoPlacementBlock.count({ where }),
      ]);

      const ALL_LIMIT = 200;
      const rowsAll =
        totalActive <= ALL_LIMIT
          ? await this.prisma.promoPlacementBlock.findMany({
              where,
              orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
              take: ALL_LIMIT,
              include: {
                targetEvent: { select: { id: true, title: true, slug: true, isActive: true, isDeleted: true } },
                targetCollection: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true } },
                targetLanding: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true, city: { select: { slug: true } } } },
                targetArticle: { select: { id: true, title: true, slug: true, status: true, publishedAt: true } },
              },
            })
          : await this.prisma.promoPlacementBlock.findMany({
              where,
              orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
              take: ALL_LIMIT,
              include: {
                targetEvent: { select: { id: true, title: true, slug: true, isActive: true, isDeleted: true } },
                targetCollection: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true } },
                targetLanding: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true, city: { select: { slug: true } } } },
                targetArticle: { select: { id: true, title: true, slug: true, status: true, publishedAt: true } },
              },
            });

      activeTotal = totalActive;
      activeShown = rowsAll.length;
      activeTruncated = totalActive > ALL_LIMIT;
      winnerId = rowsAll[0]?.id ?? null;

      const rows = rowsTop;

      const seoByEventId = await this.computeEventSeoSignals(
        rowsAll.filter((r) => r.targetType === PromoTargetType.EVENT && r.targetEventId).map((r) => r.targetEventId!),
      );

      resolvedTop = rows.map((r) =>
        this.toResolvedPreviewItem(
          r,
          r.targetType === PromoTargetType.EVENT && r.targetEventId ? seoByEventId.get(r.targetEventId) : undefined,
        ),
      );
      resolvedAll = rowsAll.map((r) =>
        this.toResolvedPreviewItem(
          r,
          r.targetType === PromoTargetType.EVENT && r.targetEventId ? seoByEventId.get(r.targetEventId) : undefined,
        ),
      );

      // Add ordering explanation for each resolved candidate (very narrow, no rules engine).
      resolvedAll = resolvedAll.map((x, idx, arr) => {
        if (idx === 0) return { ...x, rankExplanation: { primaryOrderingFactor: 'PRIORITY' } as RankExplanation };
        const prev = arr[idx - 1]!;
        let factor: RankExplanation['primaryOrderingFactor'] = 'UPDATED_AT';
        if (x.priority !== prev.priority) factor = 'PRIORITY';
        else if (x.sortOrder !== prev.sortOrder) factor = 'SORT_ORDER';
        else factor = 'UPDATED_AT';
        return { ...x, rankExplanation: { primaryOrderingFactor: factor } as RankExplanation };
      });

      const idxAll = rowsAll.findIndex((r) => r.id === id);
      if (idxAll >= 0) {
        selected = true;
        rank = idxAll + 1;
      }

      if (rowsAll.length > 1) reasons.push('CONFLICT_MULTIPLE_ACTIVE');
      if (winnerId && winnerId !== id && scopeMatch && base.readinessStatus === 'READY') reasons.push('OUTRANKED');

      // Structured comparison to winner for the current block (operator-facing).
      comparisonToWinner = this.buildComparisonToWinner({
        isWinner: winnerId === id,
        scopeMatch,
        baseReadiness: base,
        current: { priority: row.priority, sortOrder: row.sortOrder, updatedAt: row.updatedAt },
        winner: winnerId ? rowsAll.find((r) => r.id === winnerId) ?? null : null,
      });
    }

    return {
      id: row.id,
      placementZone: row.placementZone,
      context: ctx,
      baseReadiness: base,
      diagnostics: {
        readinessStatus: base.readinessStatus,
        readinessReasons: uniqReasons(reasons),
        scopeMatch,
        selected,
        rank,
        activeCount: activeShown,
        activeTotal,
        activeTruncated,
        winnerId,
        comparisonToWinner,
      },
      resolvedTop,
      resolvedAll,
    };
  }

  async create(data: CreatePromoPlacementBlockDto) {
    const normalized = this.normalizeDates(data.startsAt ?? null, data.endsAt ?? null);
    // DTO type is narrower than Record<string, unknown>; validation expects a generic object.
    const v = data as unknown as Record<string, unknown>;
    this.validateScope(data.pageScopeType, v);
    this.validateTarget(data.targetType, v);
    await this.validateTargetExistsAndPublishable(data.targetType, v);

    return this.prisma.promoPlacementBlock.create({
      data: {
        title: data.title,
        status: PromoBlockStatus.DRAFT,
        placementZone: data.placementZone,
        pageScopeType: data.pageScopeType,
        cityId: data.cityId ?? null,
        landingId: data.landingId ?? null,
        collectionId: data.collectionId ?? null,
        articleId: data.articleId ?? null,
        targetType: data.targetType,
        targetEventId: data.targetEventId ?? null,
        targetCollectionId: data.targetCollectionId ?? null,
        targetLandingId: data.targetLandingId ?? null,
        targetArticleId: data.targetArticleId ?? null,
        customTitle: data.customTitle ?? null,
        customSubtitle: data.customSubtitle ?? null,
        customImageUrl: data.customImageUrl ?? null,
        ctaLabel: data.ctaLabel ?? null,
        priority: data.priority ?? 0,
        sortOrder: data.sortOrder ?? 0,
        startsAt: normalized.startsAt,
        endsAt: normalized.endsAt,
      },
    });
  }

  async update(id: string, data: UpdatePromoPlacementBlockDto) {
    const current = await this.prisma.promoPlacementBlock.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Promo block not found');

    const nextScopeType = data.pageScopeType ?? current.pageScopeType;
    const nextTargetType = data.targetType ?? current.targetType;
    const normalized = this.normalizeDates(
      data.startsAt !== undefined ? data.startsAt : current.startsAt?.toISOString() ?? null,
      data.endsAt !== undefined ? data.endsAt : current.endsAt?.toISOString() ?? null,
    );

    const mergedForValidation = {
      ...current,
      ...data,
      startsAt: normalized.startsAt,
      endsAt: normalized.endsAt,
      pageScopeType: nextScopeType,
      targetType: nextTargetType,
    } as unknown as Record<string, unknown>;

    this.validateScope(nextScopeType, mergedForValidation);
    this.validateTarget(nextTargetType, mergedForValidation);
    await this.validateTargetExistsAndPublishable(nextTargetType, mergedForValidation);

    const patch: Prisma.PromoPlacementBlockUpdateInput = {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.placementZone !== undefined ? { placementZone: data.placementZone } : {}),
      ...(data.pageScopeType !== undefined ? { pageScopeType: data.pageScopeType } : {}),
      ...(data.cityId !== undefined ? { cityId: data.cityId } : {}),
      ...(data.landingId !== undefined ? { landingId: data.landingId } : {}),
      ...(data.collectionId !== undefined ? { collectionId: data.collectionId } : {}),
      ...(data.articleId !== undefined ? { articleId: data.articleId } : {}),
      ...(data.targetType !== undefined ? { targetType: data.targetType } : {}),
      ...(data.targetEventId !== undefined ? { targetEventId: data.targetEventId } : {}),
      ...(data.targetCollectionId !== undefined ? { targetCollectionId: data.targetCollectionId } : {}),
      ...(data.targetLandingId !== undefined ? { targetLandingId: data.targetLandingId } : {}),
      ...(data.targetArticleId !== undefined ? { targetArticleId: data.targetArticleId } : {}),
      ...(data.customTitle !== undefined ? { customTitle: data.customTitle } : {}),
      ...(data.customSubtitle !== undefined ? { customSubtitle: data.customSubtitle } : {}),
      ...(data.customImageUrl !== undefined ? { customImageUrl: data.customImageUrl } : {}),
      ...(data.ctaLabel !== undefined ? { ctaLabel: data.ctaLabel } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.startsAt !== undefined || data.endsAt !== undefined
        ? { startsAt: normalized.startsAt, endsAt: normalized.endsAt }
        : {}),
    };

    if (data.status === PromoBlockStatus.PUBLISHED) {
      if (!current.publishedAt) {
        patch.publishedAt = new Date();
      }
    }

    return this.prisma.promoPlacementBlock.update({ where: { id }, data: patch });
  }

  private validateScope(scopeType: PromoPageScopeType, data: Record<string, unknown>) {
    const cityId = (data.cityId ?? null) as string | null;
    const landingId = (data.landingId ?? null) as string | null;
    const collectionId = (data.collectionId ?? null) as string | null;
    const articleId = (data.articleId ?? null) as string | null;

    if (scopeType === PromoPageScopeType.GLOBAL) {
      if (cityId || landingId || collectionId || articleId) {
        throw new BadRequestException('Для GLOBAL scope контекстные поля должны быть пустыми');
      }
      return;
    }
    if (scopeType === PromoPageScopeType.CITY) {
      if (!cityId) throw new BadRequestException('Для CITY scope обязателен cityId');
      return;
    }
    if (scopeType === PromoPageScopeType.LANDING) {
      if (!landingId) throw new BadRequestException('Для LANDING scope обязателен landingId');
      return;
    }
    if (scopeType === PromoPageScopeType.COLLECTION) {
      if (!collectionId) throw new BadRequestException('Для COLLECTION scope обязателен collectionId');
      return;
    }
    if (scopeType === PromoPageScopeType.ARTICLE) {
      if (!articleId) throw new BadRequestException('Для ARTICLE scope обязателен articleId');
      return;
    }
  }

  private validateTarget(targetType: PromoTargetType, data: Record<string, unknown>) {
    const targetEventId = (data.targetEventId ?? null) as string | null;
    const targetCollectionId = (data.targetCollectionId ?? null) as string | null;
    const targetLandingId = (data.targetLandingId ?? null) as string | null;
    const targetArticleId = (data.targetArticleId ?? null) as string | null;

    const othersNonNull =
      (targetType !== PromoTargetType.EVENT && !!targetEventId) ||
      (targetType !== PromoTargetType.COLLECTION && !!targetCollectionId) ||
      (targetType !== PromoTargetType.LANDING && !!targetLandingId) ||
      (targetType !== PromoTargetType.ARTICLE && !!targetArticleId);
    if (othersNonNull) {
      throw new BadRequestException('Target поля должны соответствовать targetType (лишние target*Id должны быть пустыми)');
    }

    if (targetType === PromoTargetType.EVENT && !targetEventId) {
      throw new BadRequestException('Для EVENT target обязателен targetEventId');
    }
    if (targetType === PromoTargetType.COLLECTION && !targetCollectionId) {
      throw new BadRequestException('Для COLLECTION target обязателен targetCollectionId');
    }
    if (targetType === PromoTargetType.LANDING && !targetLandingId) {
      throw new BadRequestException('Для LANDING target обязателен targetLandingId');
    }
    if (targetType === PromoTargetType.ARTICLE && !targetArticleId) {
      throw new BadRequestException('Для ARTICLE target обязателен targetArticleId');
    }
  }

  private normalizeDates(startsAtIso: string | null, endsAtIso: string | null) {
    const startsAt = startsAtIso ? new Date(startsAtIso) : null;
    const endsAt = endsAtIso ? new Date(endsAtIso) : null;
    if (startsAt && Number.isNaN(startsAt.getTime())) throw new BadRequestException('startsAt некорректен');
    if (endsAt && Number.isNaN(endsAt.getTime())) throw new BadRequestException('endsAt некорректен');
    if (startsAt && endsAt && startsAt > endsAt) throw new BadRequestException('startsAt должен быть <= endsAt');
    return { startsAt, endsAt };
  }

  private async validateTargetExistsAndPublishable(targetType: PromoTargetType, data: Record<string, unknown>) {
    if (targetType === PromoTargetType.EVENT) {
      const id = (data.targetEventId ?? null) as string | null;
      if (!id) return;
      const ev = await this.prisma.event.findUnique({ where: { id }, select: { id: true, isActive: true, isDeleted: true, slug: true } });
      if (!ev) throw new BadRequestException('targetEventId: event не найден');
      if (!ev.isActive || ev.isDeleted) throw new BadRequestException('targetEventId: event не пригоден для публичной ссылки');
      return;
    }
    if (targetType === PromoTargetType.COLLECTION) {
      const id = (data.targetCollectionId ?? null) as string | null;
      if (!id) return;
      const col = await this.prisma.collection.findUnique({ where: { id }, select: { id: true, status: true, isActive: true, isDeleted: true, slug: true } });
      if (!col) throw new BadRequestException('targetCollectionId: collection не найдена');
      if (!col.isActive || col.isDeleted || col.status !== CollectionStatus.ACTIVE) {
        throw new BadRequestException('targetCollectionId: collection не опубликована/неактивна');
      }
      return;
    }
    if (targetType === PromoTargetType.LANDING) {
      const id = (data.targetLandingId ?? null) as string | null;
      if (!id) return;
      const landing = await this.prisma.landingPage.findUnique({
        where: { id },
        select: { id: true, status: true, isActive: true, isDeleted: true, slug: true, city: { select: { slug: true } } },
      });
      if (!landing) throw new BadRequestException('targetLandingId: landing не найден');
      if (!landing.isActive || landing.isDeleted || landing.status !== LandingStatus.ACTIVE) {
        throw new BadRequestException('targetLandingId: landing не опубликован/неактивен');
      }
      if (!landing.city?.slug) {
        throw new BadRequestException('targetLandingId: landing без города пока не поддержан для публичной ссылки');
      }
      return;
    }
    if (targetType === PromoTargetType.ARTICLE) {
      const id = (data.targetArticleId ?? null) as string | null;
      if (!id) return;
      const article = await this.prisma.article.findUnique({
        where: { id },
        select: { id: true, status: true, slug: true, publishedAt: true },
      });
      if (!article) throw new BadRequestException('targetArticleId: article не найдена');
      if (article.status !== 'PUBLISHED' || !article.publishedAt) {
        throw new BadRequestException('targetArticleId: article не опубликована');
      }
    }
  }

  private toListItem(
    r: Prisma.PromoPlacementBlockGetPayload<{
      include: {
        city: { select: { id: true; name: true; slug: true } };
        landing: { select: { id: true; title: true; slug: true; city: { select: { slug: true; name: true } } } };
        collection: { select: { id: true; title: true; slug: true } };
        article: { select: { id: true; title: true; slug: true } };
        targetEvent: { select: { id: true; title: true; slug: true; isActive: true; isDeleted: true } };
        targetCollection: { select: { id: true; title: true; slug: true; status: true; isActive: true; isDeleted: true } };
        targetLanding: { select: { id: true; title: true; slug: true; status: true; isActive: true; isDeleted: true; city: { select: { slug: true; name: true } } } };
        targetArticle: { select: { id: true; title: true; slug: true; status: true; publishedAt: true } };
      };
  }>,
    seo?: SeoSignals,
  ) {
    const now = new Date();
    const active = isActiveNow(r.status, r.startsAt ?? null, r.endsAt ?? null, now);
    const { resolvedUrl, displayTitle, displaySubtitle, displayImageUrl } = this.buildPreview(r);
    const readiness = this.computeReadiness(r, now);
    const target =
      r.targetType === PromoTargetType.EVENT
        ? r.targetEvent
        : r.targetType === PromoTargetType.COLLECTION
          ? r.targetCollection
          : r.targetType === PromoTargetType.LANDING
            ? r.targetLanding
            : r.targetArticle;
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      placementZone: r.placementZone,
      pageScopeType: r.pageScopeType,
      city: r.city,
      landing: r.landing ? { id: r.landing.id, title: r.landing.title, slug: r.landing.slug } : null,
      collection: r.collection ? { id: r.collection.id, title: r.collection.title, slug: r.collection.slug } : null,
      article: r.article ? { id: r.article.id, title: r.article.title, slug: r.article.slug } : null,
      targetType: r.targetType,
      targetSummary: target ? { id: target.id, title: (target as { title: string }).title, slug: (target as { slug: string }).slug } : null,
      priority: r.priority,
      sortOrder: r.sortOrder,
      startsAt: r.startsAt ? r.startsAt.toISOString() : null,
      endsAt: r.endsAt ? r.endsAt.toISOString() : null,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      isCurrentlyActive: active,
      preview: { resolvedUrl, displayTitle, displaySubtitle, displayImageUrl },
      readinessStatus: readiness.readinessStatus,
      readinessReasons: readiness.readinessReasons,
      targetHasSeoIssues: seo?.targetHasSeoIssues ?? false,
      seoIssueCodes: seo?.seoIssueCodes ?? [],
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private toDetail(
    r: Prisma.PromoPlacementBlockGetPayload<{
      include: {
        city: { select: { id: true; name: true; slug: true } };
        landing: { select: { id: true; title: true; slug: true; city: { select: { id: true; slug: true; name: true } } } };
        collection: { select: { id: true; title: true; slug: true } };
        article: { select: { id: true; title: true; slug: true } };
        targetEvent: { select: { id: true; title: true; slug: true; isActive: true; isDeleted: true } };
        targetCollection: { select: { id: true; title: true; slug: true; status: true; isActive: true; isDeleted: true } };
        targetLanding: {
          select: {
            id: true;
            title: true;
            slug: true;
            status: true;
            isActive: true;
            isDeleted: true;
            city: { select: { slug: true; name: true } };
          };
        };
        targetArticle: { select: { id: true; title: true; slug: true; status: true; publishedAt: true } };
      };
    }>,
    seo?: SeoSignals,
  ) {
    const now = new Date();
    const active = isActiveNow(r.status, r.startsAt ?? null, r.endsAt ?? null, now);
    const { resolvedUrl, displayTitle, displaySubtitle, displayImageUrl } = this.buildPreview(r);
    const readiness = this.computeReadiness(r, now);

    const target =
      r.targetType === PromoTargetType.EVENT
        ? r.targetEvent
        : r.targetType === PromoTargetType.COLLECTION
          ? r.targetCollection
          : r.targetType === PromoTargetType.LANDING
            ? r.targetLanding
            : r.targetArticle;

    return {
      id: r.id,
      title: r.title,
      status: r.status,
      placementZone: r.placementZone,
      pageScopeType: r.pageScopeType,
      city: r.city,
      landing: r.landing ? { id: r.landing.id, title: r.landing.title, slug: r.landing.slug } : null,
      collection: r.collection ? { id: r.collection.id, title: r.collection.title, slug: r.collection.slug } : null,
      article: r.article ? { id: r.article.id, title: r.article.title, slug: r.article.slug } : null,
      targetType: r.targetType,
      target: target
        ? { id: target.id, title: (target as { title: string }).title, slug: (target as { slug: string }).slug, kind: r.targetType }
        : null,
      customTitle: r.customTitle,
      customSubtitle: r.customSubtitle,
      customImageUrl: r.customImageUrl,
      ctaLabel: r.ctaLabel,
      priority: r.priority,
      sortOrder: r.sortOrder,
      startsAt: r.startsAt ? r.startsAt.toISOString() : null,
      endsAt: r.endsAt ? r.endsAt.toISOString() : null,
      isCurrentlyActive: active,
      preview: { resolvedUrl, displayTitle, displaySubtitle, displayImageUrl },
      readinessStatus: readiness.readinessStatus,
      readinessReasons: readiness.readinessReasons,
      targetHasSeoIssues: seo?.targetHasSeoIssues ?? false,
      seoIssueCodes: seo?.seoIssueCodes ?? [],
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private computeReadiness(
    r: Prisma.PromoPlacementBlockGetPayload<{
      include: {
        targetEvent: { select: { id: true; title: true; slug: true; isActive: true; isDeleted: true } };
        targetCollection: { select: { id: true; title: true; slug: true; status: true; isActive: true; isDeleted: true } };
        targetLanding: { select: { id: true; title: true; slug: true; status: true; isActive: true; isDeleted: true } };
        targetArticle: { select: { id: true; title: true; slug: true; status: true; publishedAt: true } };
      };
    }>,
    now: Date,
  ): Readiness {
    const reasons: ReadinessReason[] = [];

    const scopeOk =
      r.pageScopeType === PromoPageScopeType.GLOBAL
        ? !r.cityId && !r.landingId && !r.collectionId && !r.articleId
        : r.pageScopeType === PromoPageScopeType.CITY
          ? Boolean(r.cityId)
          : r.pageScopeType === PromoPageScopeType.LANDING
            ? Boolean(r.landingId)
            : r.pageScopeType === PromoPageScopeType.COLLECTION
              ? Boolean(r.collectionId)
              : Boolean(r.articleId);

    if (!scopeOk) reasons.push('UNSUPPORTED_CONTEXT');

    const windowScheduled = r.startsAt ? now < r.startsAt : false;
    const windowExpired = r.endsAt ? now > r.endsAt : false;

    if (r.status !== PromoBlockStatus.PUBLISHED) reasons.push('NOT_PUBLISHED');
    if (windowScheduled) reasons.push('WINDOW_NOT_STARTED');
    if (windowExpired) reasons.push('WINDOW_EXPIRED');

    const hasTargetId =
      r.targetType === PromoTargetType.EVENT
        ? Boolean(r.targetEventId)
        : r.targetType === PromoTargetType.COLLECTION
          ? Boolean(r.targetCollectionId)
          : r.targetType === PromoTargetType.LANDING
            ? Boolean(r.targetLandingId)
            : Boolean(r.targetArticleId);

    if (!hasTargetId) reasons.push('NO_TARGET');

    const targetPublishable =
      r.targetType === PromoTargetType.EVENT
        ? Boolean(r.targetEvent && !r.targetEvent.isDeleted && r.targetEvent.isActive)
        : r.targetType === PromoTargetType.COLLECTION
          ? Boolean(
              r.targetCollection &&
                !r.targetCollection.isDeleted &&
                r.targetCollection.isActive &&
                r.targetCollection.status === CollectionStatus.ACTIVE,
            )
          : r.targetType === PromoTargetType.LANDING
            ? Boolean(
                r.targetLanding &&
                  !r.targetLanding.isDeleted &&
                  r.targetLanding.isActive &&
                  r.targetLanding.status === LandingStatus.ACTIVE,
              )
            : Boolean(r.targetArticle && r.targetArticle.status === 'PUBLISHED' && r.targetArticle.publishedAt);

    if (hasTargetId && !targetPublishable) reasons.push('NO_RESOLVED_CONTENT');

    const misconfigured = !scopeOk || !hasTargetId;
    const inactive = r.status !== PromoBlockStatus.PUBLISHED;

    let readinessStatus: ReadinessStatus;
    if (misconfigured) readinessStatus = 'MISCONFIGURED';
    else if (inactive) readinessStatus = 'INACTIVE';
    else if (windowScheduled) readinessStatus = 'SCHEDULED';
    else if (windowExpired) readinessStatus = 'EXPIRED';
    else if (!targetPublishable) readinessStatus = 'EMPTY';
    else readinessStatus = 'READY';

    return { readinessStatus, readinessReasons: uniqReasons(reasons) };
  }

  private toResolvedPreviewItem(
    r: Prisma.PromoPlacementBlockGetPayload<{
      include: {
        targetEvent: { select: { id: true; title: true; slug: true; isActive: true; isDeleted: true } };
        targetCollection: { select: { id: true; title: true; slug: true; status: true; isActive: true; isDeleted: true } };
        targetLanding: { select: { id: true; title: true; slug: true; status: true; isActive: true; isDeleted: true; city: { select: { slug: true } } } };
        targetArticle: { select: { id: true; title: true; slug: true; status: true; publishedAt: true } };
      };
    }>,
    seo?: SeoSignals,
  ) {
    const { resolvedUrl, displayTitle, displaySubtitle, displayImageUrl } = this.buildPreview(r as any);
    const target =
      r.targetType === PromoTargetType.EVENT
        ? r.targetEvent
        : r.targetType === PromoTargetType.COLLECTION
          ? r.targetCollection
          : r.targetType === PromoTargetType.LANDING
            ? r.targetLanding
            : r.targetArticle;
    return {
      id: r.id,
      title: r.title,
      targetType: r.targetType,
      targetSummary: target ? { id: target.id, title: (target as { title: string }).title, slug: (target as { slug: string }).slug } : null,
      priority: r.priority,
      sortOrder: r.sortOrder,
      preview: { resolvedUrl, displayTitle, displaySubtitle, displayImageUrl },
      targetHasSeoIssues: seo?.targetHasSeoIssues ?? false,
      seoIssueCodes: seo?.seoIssueCodes ?? [],
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private buildComparisonToWinner(args: {
    isWinner: boolean;
    scopeMatch: boolean;
    baseReadiness: Readiness;
    current: { priority: number; sortOrder: number; updatedAt: Date };
    winner: { priority: number; sortOrder: number; updatedAt: Date } | null;
  }): ComparisonToWinner {
    if (args.isWinner) return { outcome: 'WINNER', reasons: [] };

    const reasons: ComparisonReason[] = [];
    if (!args.scopeMatch) reasons.push('SCOPE_MISMATCH');

    for (const r of args.baseReadiness.readinessReasons) {
      if (r === 'NOT_PUBLISHED') reasons.push('NOT_PUBLISHED');
      if (r === 'WINDOW_NOT_STARTED') reasons.push('WINDOW_NOT_STARTED');
      if (r === 'WINDOW_EXPIRED') reasons.push('WINDOW_EXPIRED');
    }

    const eligible = args.scopeMatch && args.baseReadiness.readinessStatus === 'READY';
    if (!eligible) {
      const outcome: ComparisonOutcome =
        args.baseReadiness.readinessStatus === 'READY' ? 'NOT_ELIGIBLE' : 'INACTIVE';
      return { outcome, reasons: uniqReasons(reasons) };
    }

    if (args.winner) {
      if (args.current.priority < args.winner.priority) reasons.push('LOWER_PRIORITY');
      else if (args.current.priority === args.winner.priority && args.current.sortOrder > args.winner.sortOrder) {
        reasons.push('HIGHER_SORT_ORDER');
      } else if (
        args.current.priority === args.winner.priority &&
        args.current.sortOrder === args.winner.sortOrder &&
        args.current.updatedAt.getTime() < args.winner.updatedAt.getTime()
      ) {
        reasons.push('OLDER_UPDATED_AT_TIEBREAKER');
      }
    }

    return { outcome: 'OUTRANKED', reasons: uniqReasons(reasons) };
  }

  private async computeEventSeoSignals(eventIds: string[]): Promise<Map<string, SeoSignals>> {
    const ids = Array.from(new Set(eventIds)).filter(Boolean);
    const out = new Map<string, SeoSignals>();
    if (ids.length === 0) return out;

    const now = new Date();

    const base = await this.prisma.event.findMany({
      where: { id: { in: ids }, isDeleted: false },
      select: {
        id: true,
        isActive: true,
        imageUrl: true,
        override: { select: { imageUrl: true } },
        description: true,
        shortDescription: true,
      },
    });

    const withPrice = await this.prisma.event.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
        offers: { some: { isDeleted: false, status: 'ACTIVE', priceFrom: { gt: 0 } } },
      },
      select: { id: true },
    });
    const withPriceSet = new Set(withPrice.map((x) => x.id));

    const withFutureSessions = await this.prisma.event.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
        sessions: { some: { isActive: true, canceledAt: null, startsAt: { gt: now } } },
      },
      select: { id: true },
    });
    const withFutureSet = new Set(withFutureSessions.map((x) => x.id));

    for (const e of base) {
      const codes: string[] = [];
      const hasImage = Boolean(e.imageUrl) || Boolean(e.override?.imageUrl);
      if (!hasImage) codes.push('NO_PHOTO');

      const hasPrice = withPriceSet.has(e.id);
      if (!hasPrice) codes.push('NO_PRICE');

      const desc = (e.description ?? '').trim() || (e.shortDescription ?? '').trim();
      if (!desc || desc.length < 120) codes.push('WEAK_DESC');

      const hasFuture = withFutureSet.has(e.id);
      if (e.isActive && !hasFuture) codes.push('NO_SESSIONS');

      out.set(e.id, { targetHasSeoIssues: codes.length > 0, seoIssueCodes: codes });
    }

    // Unknown IDs (deleted events) — keep empty map entry absent; UI will treat as no issues.
    return out;
  }

  private buildPreview(
    r: {
      title: string;
      customTitle: string | null;
      customSubtitle: string | null;
      customImageUrl: string | null;
      ctaLabel: string | null;
      targetType: PromoTargetType;
      targetEvent?: { id: string; title: string; slug: string } | null;
      targetCollection?: { id: string; title: string; slug: string } | null;
      targetLanding?: { id: string; title: string; slug: string; city?: { slug: string } | null } | null;
      targetArticle?: { id: string; title: string; slug: string } | null;
    },
  ) {
    const displayTitle =
      (r.customTitle ?? '').trim() ||
      (r.targetType === PromoTargetType.EVENT ? r.targetEvent?.title : null) ||
      (r.targetType === PromoTargetType.COLLECTION ? r.targetCollection?.title : null) ||
      (r.targetType === PromoTargetType.LANDING ? r.targetLanding?.title : null) ||
      (r.targetType === PromoTargetType.ARTICLE ? r.targetArticle?.title : null) ||
      r.title;

    const displaySubtitle = (r.customSubtitle ?? '').trim() || null;
    const displayImageUrl = (r.customImageUrl ?? '').trim() || null;

    const resolvedUrl =
      r.targetType === PromoTargetType.EVENT
        ? r.targetEvent?.slug
          ? `/events/${encodeURIComponent(r.targetEvent.slug)}`
          : null
        : r.targetType === PromoTargetType.COLLECTION
          ? r.targetCollection?.slug
            ? `/collections/${encodeURIComponent(r.targetCollection.slug)}`
            : null
          : r.targetType === PromoTargetType.ARTICLE
            ? r.targetArticle?.slug
              ? `/articles/${encodeURIComponent(r.targetArticle.slug)}`
              : null
            : r.targetLanding?.slug && r.targetLanding.city?.slug
              ? `/cities/${encodeURIComponent(r.targetLanding.city.slug)}/${encodeURIComponent(r.targetLanding.slug)}`
              : null;

    return { resolvedUrl, displayTitle, displaySubtitle, displayImageUrl };
  }
}

