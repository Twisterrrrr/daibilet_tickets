/**
 * Read-only аудит каталога для админки и SQL-отчётов.
 * missingCategory = нет эффективной таксономии (M:N подкатегории и legacy enum пусты);
 * колонка events.category в PostgreSQL NOT NULL — «без категории» в смысле enum здесь не используется.
 */

import { Injectable } from '@nestjs/common';
import { DateMode, Prisma } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';

export type CatalogCoverageByCity = {
  cityId: string;
  citySlug: string;
  cityName: string;
  totalEvents: number;
  coveredEvents: number;
  coveragePercent: number;
};

export type CatalogAuditResult = {
  missingCategory: number;
  missingLocation: number;
  missingOffers: number;
  missingSessions: number;
  coverageByCity: CatalogCoverageByCity[];
  generatedAt: string;
};

@Injectable()
export class CatalogAuditService {
  constructor(private readonly prisma: PrismaService) {}

  private baseListable(): Prisma.EventWhereInput {
    return {
      isActive: true,
      isDeleted: false,
      canonicalOfId: null,
    };
  }

  async getAudit(): Promise<CatalogAuditResult> {
    const now = new Date();
    const base = this.baseListable();

    const [missingCategory, missingLocation, missingOffers, missingSessions, coverageRows] = await Promise.all([
      this.prisma.event.count({
        where: {
          ...base,
          subcategoryLinks: { none: {} },
          subcategories: { isEmpty: true },
        },
      }),
      this.prisma.event.count({
        where: {
          ...base,
          venueId: null,
          startLocationId: null,
          OR: [{ address: null }, { address: '' }],
          meetingPoint: null,
          lat: null,
          lng: null,
        },
      }),
      this.prisma.event.count({
        where: { ...base, offers: { none: {} } },
      }),
      this.prisma.event.count({
        where: {
          ...base,
          dateMode: DateMode.SCHEDULED,
          sessions: { none: { isActive: true, startsAt: { gte: now } } },
        },
      }),
      this.prisma.$queryRaw<
        Array<{
          cityId: string;
          citySlug: string;
          cityName: string;
          total: bigint;
          covered: bigint;
        }>
      >(Prisma.sql`
        SELECT
          c.id AS "cityId",
          c.slug AS "citySlug",
          c.name AS "cityName",
          COUNT(e.id)::bigint AS total,
          SUM(
            CASE
              WHEN (
                EXISTS (SELECT 1 FROM event_subcategory_links esl WHERE esl."eventId" = e.id)
                OR COALESCE(array_length(e.subcategories, 1), 0) > 0
              )
              AND (
                e."venueId" IS NOT NULL
                OR e."startLocationId" IS NOT NULL
                OR (e.address IS NOT NULL AND TRIM(e.address) <> '')
                OR (e."meetingPoint" IS NOT NULL AND TRIM(e."meetingPoint") <> '')
                OR (e.lat IS NOT NULL AND e.lng IS NOT NULL)
              )
              AND EXISTS (
                SELECT 1 FROM event_offers o
                WHERE o."eventId" = e.id AND o."isDeleted" = false
              )
              AND (
                (e."dateMode" = 'OPEN_DATE' AND (e."endDate" IS NULL OR e."endDate" >= NOW()))
                OR (
                  e."dateMode" = 'SCHEDULED'
                  AND EXISTS (
                    SELECT 1 FROM event_sessions s
                    WHERE s."eventId" = e.id AND s."isActive" = true AND s."startsAt" > NOW()
                  )
                )
              )
              THEN 1
              ELSE 0
            END
          )::bigint AS covered
        FROM cities c
        INNER JOIN events e ON e."cityId" = c.id
        WHERE e."isActive" = true
          AND e."isDeleted" = false
          AND e."canonicalOfId" IS NULL
        GROUP BY c.id, c.slug, c.name
        ORDER BY c.name ASC
      `),
    ]);

    const coverageByCity: CatalogCoverageByCity[] = coverageRows.map((r) => {
      const total = Number(r.total);
      const covered = Number(r.covered);
      const coveragePercent = total === 0 ? 0 : Math.round((covered / total) * 10000) / 100;
      return {
        cityId: r.cityId,
        citySlug: r.citySlug,
        cityName: r.cityName,
        totalEvents: total,
        coveredEvents: covered,
        coveragePercent,
      };
    });

    return {
      missingCategory,
      missingLocation,
      missingOffers,
      missingSessions,
      coverageByCity,
      generatedAt: new Date().toISOString(),
    };
  }
}
