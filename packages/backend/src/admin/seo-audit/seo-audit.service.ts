/**
 * SEO Audit Service — on-the-fly (v1). Structure ready for persistence (v1.1).
 */

import { Injectable } from '@nestjs/common';
import { EventSource, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type {
  SeoAuditEventRowDto,
  SeoAuditEventsResponseDto,
  SeoAuditSummaryDto,
  SeoIssueDto,
} from './seo-audit.types';
import type { SeoAuditContext, SeoAuditEventInput } from './seo-audit-rules';
import { runAllRules } from './seo-audit-rules';

export interface SeoAuditEventsParams {
  search?: string;
  cityId?: string;
  source?: string;
  isActive?: 'true' | 'false';
  hasFutureSessions?: 'true' | 'false';
  onlyIssues?: 'true' | 'false';
  page?: string;
  limit?: string;
}

@Injectable()
export class SeoAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getEventsAudit(params: SeoAuditEventsParams): Promise<SeoAuditEventsResponseDto> {
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20', 10) || 20));
    const onlyIssues = params.onlyIssues !== 'false';
    const now = new Date();

    const where: Prisma.EventWhereInput = {
      isDeleted: false,
    };

    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (params.cityId) where.cityId = params.cityId;
    if (params.source) where.source = params.source as EventSource;
    if (params.isActive === 'true') where.isActive = true;
    if (params.isActive === 'false') where.isActive = false;

    if (params.hasFutureSessions === 'true') {
      where.sessions = {
        some: {
          isActive: true,
          canceledAt: null,
          startsAt: { gt: now },
        },
      };
    } else if (params.hasFutureSessions === 'false') {
      where.NOT = {
        sessions: {
          some: {
            isActive: true,
            canceledAt: null,
            startsAt: { gt: now },
          },
        },
      };
    }

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          shortDescription: true,
          imageUrl: true,
          priceFrom: true,
          rating: true,
          durationMinutes: true,
          minAge: true,
          groupingKey: true,
          canonicalOfId: true,
          cityId: true,
          source: true,
          isActive: true,
          updatedAt: true,
          city: { select: { name: true } },
        },
        orderBy: { updatedAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    if (events.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        pages: 0,
        summary: {
          totalEvents: await this.prisma.event.count({ where: { isDeleted: false } }),
          eventsWithIssues: 0,
          issuesTotal: 0,
          issuesBySeverity: { ERROR: 0, WARN: 0, INFO: 0 },
        },
      };
    }

    const ids = events.map((e) => e.id);
    const slugs = events.map((e) => e.slug);
    const groupingKeys = [...new Set(events.map((e) => e.groupingKey).filter(Boolean) as string[])];

    const [sessionsCounts, slugCounts, canonicalMap, groupingCountMap] = await Promise.all([
      this.getSessionsFutureCount(ids, now),
      this.getSlugCounts(slugs),
      groupingKeys.length > 0 ? this.getCanonicalByGroupingKey(groupingKeys) : Promise.resolve(new Map<string, string>()),
      groupingKeys.length > 0 ? this.getGroupingCounts(groupingKeys) : Promise.resolve(new Map<string, number>()),
    ]);

    const rows: SeoAuditEventRowDto[] = [];
    let eventsWithIssues = 0;
    const severityCounts = { ERROR: 0, WARN: 0, INFO: 0 };

    for (const e of events) {
      const input: SeoAuditEventInput = {
        id: e.id,
        title: e.title,
        slug: e.slug,
        description: e.description,
        shortDescription: e.shortDescription,
        metaTitle: null,
        metaDescription: null,
        imageUrl: e.imageUrl,
        priceFrom: e.priceFrom,
        rating: e.rating != null ? Number(e.rating) : null,
        durationMinutes: e.durationMinutes,
        minAge: e.minAge,
        groupingKey: e.groupingKey,
        canonicalOfId: e.canonicalOfId,
        cityId: e.cityId,
        cityName: e.city?.name ?? null,
        source: e.source,
        isActive: e.isActive,
        updatedAt: e.updatedAt,
      };

      const ctx: SeoAuditContext = {
        sessionsFutureCount: sessionsCounts.get(e.id) ?? 0,
        dupSlugCount: slugCounts.get(e.slug) ?? 1,
        canonicalEventId: e.groupingKey ? canonicalMap.get(e.groupingKey) ?? null : null,
        groupingCount: e.groupingKey ? groupingCountMap.get(e.groupingKey) ?? 1 : 0,
      };

      const issues = runAllRules(input, ctx);

      if (onlyIssues && issues.length === 0) continue;

      const issueCounts = countIssues(issues);
      rows.push({
        id: e.id,
        title: e.title,
        slug: e.slug,
        cityName: e.city?.name ?? '',
        source: e.source,
        isActive: e.isActive,
        updatedAt: e.updatedAt,
        priceFrom: e.priceFrom,
        imageUrl: e.imageUrl,
        rating: e.rating != null ? Number(e.rating) : null,
        sessionsFutureCount: ctx.sessionsFutureCount,
        canonicalGroup:
          e.groupingKey
            ? {
                groupingKey: e.groupingKey,
                canonicalEventId: ctx.canonicalEventId,
                isCanonical: ctx.canonicalEventId === e.id,
              }
            : undefined,
        issues,
        issueCounts,
      });

      if (issues.length > 0) {
        eventsWithIssues++;
        for (const i of issues) {
          if (i.severity === 'ERROR') severityCounts.ERROR++;
          else if (i.severity === 'WARN') severityCounts.WARN++;
          else severityCounts.INFO++;
        }
      }
    }

    rows.sort((a, b) => {
      if (a.issueCounts.ERROR !== b.issueCounts.ERROR) return b.issueCounts.ERROR - a.issueCounts.ERROR;
      if (a.issueCounts.WARN !== b.issueCounts.WARN) return b.issueCounts.WARN - a.issueCounts.WARN;
      return a.updatedAt.getTime() - b.updatedAt.getTime();
    });

    const totalEvents = await this.prisma.event.count({ where: { isDeleted: false } });
    const summary: SeoAuditSummaryDto = {
      totalEvents,
      eventsWithIssues,
      issuesTotal: severityCounts.ERROR + severityCounts.WARN + severityCounts.INFO,
      issuesBySeverity: severityCounts,
    };

    return {
      items: rows,
      total: onlyIssues ? rows.length : total,
      page,
      pages: onlyIssues ? 1 : Math.ceil(total / limit),
      summary,
    };
  }

  private async getSessionsFutureCount(
    eventIds: string[],
    now: Date,
  ): Promise<Map<string, number>> {
    const result = await this.prisma.eventSession.groupBy({
      by: ['eventId'],
      where: {
        eventId: { in: eventIds },
        isActive: true,
        canceledAt: null,
        startsAt: { gt: now },
      },
      _count: { id: true },
    });
    const map = new Map<string, number>();
    for (const r of result) map.set(r.eventId, r._count.id);
    return map;
  }

  private async getSlugCounts(slugs: string[]): Promise<Map<string, number>> {
    if (slugs.length === 0) return new Map();
    const result = await this.prisma.event.groupBy({
      by: ['slug'],
      where: {
        slug: { in: slugs },
        isDeleted: false,
      },
      _count: { id: true },
    });
    const map = new Map<string, number>();
    for (const r of result) map.set(r.slug, r._count.id);
    return map;
  }

  private async getCanonicalByGroupingKey(keys: string[]): Promise<Map<string, string>> {
    const events = await this.prisma.event.findMany({
      where: { groupingKey: { in: keys }, isDeleted: false },
      select: { id: true, groupingKey: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const map = new Map<string, string>();
    for (const e of events) {
      if (e.groupingKey && !map.has(e.groupingKey)) map.set(e.groupingKey, e.id);
    }
    return map;
  }

  private async getGroupingCounts(keys: string[]): Promise<Map<string, number>> {
    const result = await this.prisma.event.groupBy({
      by: ['groupingKey'],
      where: { groupingKey: { in: keys }, isDeleted: false },
      _count: { id: true },
    });
    const map = new Map<string, number>();
    for (const r of result)
      if (r.groupingKey) map.set(r.groupingKey, r._count.id);
    return map;
  }
}

function countIssues(issues: SeoIssueDto[]): {
  ERROR: number;
  WARN: number;
  INFO: number;
  total: number;
} {
  let ERROR = 0,
    WARN = 0,
    INFO = 0;
  for (const i of issues) {
    if (i.severity === 'ERROR') ERROR++;
    else if (i.severity === 'WARN') WARN++;
    else INFO++;
  }
  return { ERROR, WARN, INFO, total: issues.length };
}
