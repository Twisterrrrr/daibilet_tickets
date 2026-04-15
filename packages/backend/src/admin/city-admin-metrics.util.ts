import { Prisma } from '@/prisma-client';

import type { PrismaService } from '../prisma/prisma.service';

export type CityAdminListMetrics = {
  activeEvents: Map<string, number>;
  futureEvents: Map<string, number>;
  activeVenues: Map<string, number>;
  activeLandings: Map<string, number>;
};

/**
 * Агрегаты по городам для админ-списка (одна страница результатов).
 * Отдельные запросы — проще сопровождать, чем один тяжёлый JOIN.
 */
export async function loadCityAdminListMetrics(
  prisma: PrismaService,
  cityIds: string[],
  now: Date,
): Promise<CityAdminListMetrics> {
  const empty: CityAdminListMetrics = {
    activeEvents: new Map(),
    futureEvents: new Map(),
    activeVenues: new Map(),
    activeLandings: new Map(),
  };
  if (cityIds.length === 0) return empty;

  const [activeEv, futureEv, activeVen, activeLan] = await Promise.all([
    prisma.$queryRaw<Array<{ cityId: string; c: bigint }>>(
      Prisma.sql`
        SELECT e."cityId", COUNT(*)::bigint AS c
        FROM events e
        WHERE e."cityId" IN (${Prisma.join(cityIds)})
          AND e."isDeleted" = false
          AND e."isActive" = true
          AND e."moderationStatus" = 'APPROVED'::"ModerationStatus"
          AND e."canonicalOfId" IS NULL
        GROUP BY e."cityId"
      `,
    ),
    prisma.$queryRaw<Array<{ cityId: string; c: bigint }>>(
      Prisma.sql`
        SELECT e."cityId", COUNT(DISTINCT e.id)::bigint AS c
        FROM events e
        INNER JOIN event_sessions s ON s."eventId" = e.id
        WHERE e."cityId" IN (${Prisma.join(cityIds)})
          AND e."isDeleted" = false
          AND e."isActive" = true
          AND e."moderationStatus" = 'APPROVED'::"ModerationStatus"
          AND e."canonicalOfId" IS NULL
          AND s."startsAt" > ${now}
          AND s."canceledAt" IS NULL
          AND s."isActive" = true
        GROUP BY e."cityId"
      `,
    ),
    prisma.$queryRaw<Array<{ cityId: string; c: bigint }>>(
      Prisma.sql`
        SELECT v."cityId", COUNT(*)::bigint AS c
        FROM venues v
        WHERE v."cityId" IN (${Prisma.join(cityIds)})
          AND v."isDeleted" = false
          AND v."isActive" = true
          AND v."lifecycle_status" = 'ACTIVE'::"VenueLifecycleStatus"
        GROUP BY v."cityId"
      `,
    ),
    prisma.$queryRaw<Array<{ cityId: string; c: bigint }>>(
      Prisma.sql`
        SELECT l."cityId", COUNT(*)::bigint AS c
        FROM landing_pages l
        WHERE l."cityId" IN (${Prisma.join(cityIds)})
          AND l."isDeleted" = false
          AND l."isActive" = true
          AND l."status" = 'ACTIVE'::"LandingStatus"
        GROUP BY l."cityId"
      `,
    ),
  ]);

  const toMap = (rows: Array<{ cityId: string; c: bigint }>) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      m.set(r.cityId, Number(r.c));
    }
    return m;
  };

  return {
    activeEvents: toMap(activeEv),
    futureEvents: toMap(futureEv),
    activeVenues: toMap(activeVen),
    activeLandings: toMap(activeLan),
  };
}
