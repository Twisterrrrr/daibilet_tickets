import { Injectable } from '@nestjs/common';

import { DateMode, Prisma } from '@/prisma-client';



import { CACHE_TTL, CacheService } from '../cache/cache.service';

import { mapBatchedParallel } from '../common/map-batched-parallel';

import { buildLandingEventsWhere } from '../landing/landing-event-filter.helper';

import { PrismaService } from '../prisma/prisma.service';

import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';

import { CollectionSelectionService } from './collection-selection.service';



/** Публичный Redis-ключ (D3); legacy-ключ снимаем при refresh. */

export const CATALOG_CONSISTENCY_CACHE_KEY = 'catalog:consistency';

const LEGACY_CONSISTENCY_CACHE_KEY = 'admin:catalog:consistency:v4';



/** Ограничение параллельных COUNT по подборкам/лендингам (нагрузка на пул соединений БД). */

const SELECTION_COUNT_BATCH = 12;



/** По умолчанию мягкий бюджет 1s на тяжёлый блок selection; `CATALOG_CONSISTENCY_BUDGET_MS=0` — без таймаута (полный пересчёт). */

function catalogConsistencyBudgetMs(): number {

  const raw = process.env.CATALOG_CONSISTENCY_BUDGET_MS;

  if (raw === '0') return 0;

  if (raw == null || raw === '') return 1000;

  const n = parseInt(raw, 10);

  if (!Number.isFinite(n) || n < 0) return 1000;

  return Math.min(n, 30000);

}



/**

 * Агрегаты согласованности каталога (админ-диагностика Epic 2 / Post-Classification C2).

 */

@Injectable()

export class CatalogConsistencyService {

  constructor(

    private readonly prisma: PrismaService,

    private readonly collectionSelection: CollectionSelectionService,

    private readonly subcategoryPolicy: SubcategoryPolicyService,

    private readonly cache: CacheService,

  ) {}



  /** `refresh: true` — сбросить Redis-ключ и пересчитать (кнопка «Обновить» в админке). */

  async getSnapshot(options?: { refresh?: boolean }) {

    if (options?.refresh) {

      await this.cache.del(CATALOG_CONSISTENCY_CACHE_KEY);

      await this.cache.del(LEGACY_CONSISTENCY_CACHE_KEY);

      await this.cache.del('catalog:consistency:v1');

    }

    return this.cache.getOrSet(CATALOG_CONSISTENCY_CACHE_KEY, CACHE_TTL.CATALOG_CONSISTENCY, () =>

      this.computeSnapshotWithOptionalBudget(),

    );

  }



  private async computeSnapshotWithOptionalBudget() {

    const budgetMs = catalogConsistencyBudgetMs();

    if (budgetMs <= 0) {

      const full = await this.computeSnapshotFull();

      return { ...full, degraded: false as const };

    }



    const core = await this.computeSnapshotCore();

    const selectionRace = Promise.race([

      this.computeSnapshotSelection().then((selection) => ({ ok: true as const, selection })),

      new Promise<{ ok: false }>((resolve) => {

        setTimeout(() => resolve({ ok: false }), budgetMs);

      }),

    ]);



    const result = await selectionRace;

    if (!result.ok) {

      return {

        ...this.mergeSnapshot(core, this.emptySelection()),

        degraded: true as const,

      };

    }

    return {

      ...this.mergeSnapshot(core, result.selection),

      degraded: false as const,

    };

  }



  private emptySelection() {

    return {

      activeCollectionsWithZeroEligibleEvents: 0,

      activeCollectionsTotal: 0,

      activeLandingsWithZeroEligibleEvents: 0,

      activeLandingsTotal: 0,

    };

  }



  private mergeSnapshot(

    core: Awaited<ReturnType<CatalogConsistencyService['computeSnapshotCore']>>,

    selection: ReturnType<CatalogConsistencyService['emptySelection']>,

  ) {

    return {

      generatedAt: new Date().toISOString(),

      cacheTtlSeconds: CACHE_TTL.CATALOG_CONSISTENCY,

      events: core.events,

      quality: core.quality,

      selection,

    };

  }



  private async computeSnapshotFull() {

    const core = await this.computeSnapshotCore();

    const selection = await this.computeSnapshotSelection();

    return this.mergeSnapshot(core, selection);

  }



  private async computeSnapshotCore() {

    const now = new Date();

    const baseListable: Prisma.EventWhereInput = {

      isActive: true,

      isDeleted: false,

      canonicalOfId: null,

    };



    const [

      listableEventsTotal,

      listableEventsNoPrimaryImage,

      eventsNoEffectiveSubcategory,

      eventsExcessSubcategoryLinks,

      eventsAtSubcategoryCap3,

      overridesBlocked,

      eventsWeakLocation,

      eventsNoOffers,

      eventsScheduledNoUpcomingSessions,

    ] = await Promise.all([

      this.prisma.event.count({ where: baseListable }),

      this.prisma.event.count({

        where: {

          ...baseListable,

          OR: [{ imageUrl: null }, { imageUrl: '' }],

        },

      }),

      this.prisma.event.count({

        where: {

          ...baseListable,

          subcategoryLinks: { none: {} },

          subcategories: { isEmpty: true },

        },

      }),

      this.countEventsWithMoreThanThreeSubcategoryLinks(),

      this.countEventsWithExactlyThreeSubcategoryLinks(),

      this.prisma.eventOverride.count({

        where: { qualityStatus: 'BLOCKED' },

      }),

      this.prisma.event.count({

        where: {

          ...baseListable,

          venueId: null,

          startLocationId: null,

          OR: [{ address: null }, { address: '' }],

          lat: null,

          lng: null,

        },

      }),

      this.prisma.event.count({

        where: { ...baseListable, offers: { none: {} } },

      }),

      this.prisma.event.count({

        where: {

          ...baseListable,

          dateMode: DateMode.SCHEDULED,

          sessions: { none: { isActive: true, startsAt: { gte: now } } },

        },

      }),

    ]);



    return {

      events: {

        listableTotal: listableEventsTotal,

        noPrimaryImage: listableEventsNoPrimaryImage,

        noEffectiveSubcategory: eventsNoEffectiveSubcategory,

        excessSubcategoryLinksOver3: eventsExcessSubcategoryLinks,

        atSubcategoryCap3Links: eventsAtSubcategoryCap3,

        weakLocationNoVenueNoPoint: eventsWeakLocation,

        noOffers: eventsNoOffers,

        scheduledNoUpcomingSessions: eventsScheduledNoUpcomingSessions,

      },

      quality: {

        eventOverridesBlocked: overridesBlocked,

      },

    };

  }



  private async computeSnapshotSelection() {

    const now = new Date();



    const collections = await this.prisma.collection.findMany({

      where: { isDeleted: false, isActive: true, cityId: { not: null } },

      select: {

        id: true,

        cityId: true,

        filterTags: true,

        filterCategory: true,

        filterSubcategory: true,

        filterAudience: true,

        additionalFilters: true,

      },

    });



    const collectionCounts = await mapBatchedParallel(collections, SELECTION_COUNT_BATCH, (c) => {

      if (!c.cityId) return Promise.resolve(-1);

      const where = this.collectionSelection.buildWhere({

        cityId: c.cityId,

        filterTags: c.filterTags,

        filterCategory: c.filterCategory,

        filterSubcategory: c.filterSubcategory,

        filterAudience: c.filterAudience,

        additionalFilters: c.additionalFilters,

      });

      return this.prisma.event.count({ where });

    });

    let activeCollectionsWithZeroEligibleEvents = 0;

    for (let i = 0; i < collectionCounts.length; i++) {

      if (collectionCounts[i] === 0) activeCollectionsWithZeroEligibleEvents += 1;

    }



    const landings = await this.prisma.landingPage.findMany({

      where: { isDeleted: false, isActive: true },

      select: { id: true, cityId: true, filterTag: true, additionalFilters: true },

    });



    const landingCounts = await mapBatchedParallel(landings, SELECTION_COUNT_BATCH, async (l) => {

      const tag = await this.prisma.tag.findFirst({

        where: { slug: l.filterTag, isActive: true },

        select: { id: true },

      });

      const eventsWhere = buildLandingEventsWhere({

        cityId: l.cityId,

        now,

        tag,

        additionalFilters: l.additionalFilters,

        subcategoryPolicy: this.subcategoryPolicy,

      });

      if (!eventsWhere) return 0;

      return this.prisma.event.count({ where: eventsWhere });

    });

    let activeLandingsWithZeroEligibleEvents = 0;

    for (let i = 0; i < landingCounts.length; i++) {

      if (landingCounts[i] === 0) activeLandingsWithZeroEligibleEvents += 1;

    }



    return {

      activeCollectionsWithZeroEligibleEvents,

      activeCollectionsTotal: collections.length,

      activeLandingsWithZeroEligibleEvents,

      activeLandingsTotal: landings.length,

    };

  }



  private async countEventsWithMoreThanThreeSubcategoryLinks(): Promise<number> {

    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`

      SELECT COUNT(*)::bigint AS count

      FROM (

        SELECT e.id

        FROM events e

        INNER JOIN event_subcategory_links esl ON esl."eventId" = e.id

        WHERE e."canonicalOfId" IS NULL AND e."isDeleted" = false

        GROUP BY e.id

        HAVING COUNT(*) > 3

      ) t

    `);

    return Number(rows[0]?.count ?? 0);

  }



  private async countEventsWithExactlyThreeSubcategoryLinks(): Promise<number> {

    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`

      SELECT COUNT(*)::bigint AS count

      FROM (

        SELECT e.id

        FROM events e

        INNER JOIN event_subcategory_links esl ON esl."eventId" = e.id

        WHERE e."canonicalOfId" IS NULL AND e."isDeleted" = false

        GROUP BY e.id

        HAVING COUNT(*) = 3

      ) t

    `);

    return Number(rows[0]?.count ?? 0);

  }

}


