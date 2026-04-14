import { Injectable } from '@nestjs/common';
import { Prisma, type VenueImportSource, type VenueModerationAction } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';

import { classifyVenueHintOutcome } from './venue-moderation-hint-outcome.util';
import { VenueDecisionHint } from './venue-decision-hint.util';

const _HINT_KEYS = [
  VenueDecisionHint.MERGE_RECOMMENDED,
  VenueDecisionHint.APPROVE_AS_NEW,
  VenueDecisionHint.NEEDS_REVIEW,
  VenueDecisionHint.REJECT_RECOMMENDED,
] as const;

export type HintAcceptanceBreakdownDto = {
  total: number;
  accepted: number;
  rejected: number;
  overridden: number;
};

export type VenueModerationMetricsDto = {
  volume: {
    draftsTotal: number;
    moderatedTotal: number;
  };
  counts: {
    approvedTotal: number;
    rejectedTotal: number;
    mergedTotal: number;
  };
  rates: {
    approveRate: number;
    rejectRate: number;
    mergeRate: number;
  };
  decisionHints: {
    totalWithHint: number;
    byHint: {
      MERGE_RECOMMENDED: number;
      APPROVE_AS_NEW: number;
      NEEDS_REVIEW: number;
      REJECT_RECOMMENDED: number;
    };
  };
  hintAcceptance: {
    MERGE_RECOMMENDED: HintAcceptanceBreakdownDto;
    APPROVE_AS_NEW: HintAcceptanceBreakdownDto;
    REJECT_RECOMMENDED: HintAcceptanceBreakdownDto;
  };
  sourceQuality: Array<{
    importSource: string;
    total: number;
    approveRate: number;
    rejectRate: number;
    mergeRate: number;
    needsReviewRate: number;
    avgConfidence: number;
  }>;
  rejectReasonsDetailed: Array<{
    reasonCode: string;
    count: number;
    share: number;
  }>;
  throughput: {
    timeToFirstDecisionAvgMs: number | null;
    timeToFirstDecisionP50Ms: number | null;
    timeToFirstDecisionP95Ms: number | null;
  };
  warnings: {
    slugCollisionRate: number;
    staleStateRate: number;
  };
};

export type VenueModerationSourceRowDto = {
  importSource: string;
  total: number;
  approved: number;
  rejected: number;
  merged: number;
  needsReview: number;
  avgConfidence: number;
  topRejectReasons: Array<{ reasonCode: string; count: number }>;
};

export type VenueModerationSourcesResponseDto = {
  sources: VenueModerationSourceRowDto[];
};

function emptyHintBreakdown(): HintAcceptanceBreakdownDto {
  return { total: 0, accepted: 0, rejected: 0, overridden: 0 };
}

function percentileSorted(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[Math.min(idx, sorted.length - 1)]!;
}

@Injectable()
export class VenueModerationMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(params: {
    from?: Date;
    to?: Date;
    importSource?: VenueImportSource;
  }): Promise<VenueModerationMetricsDto> {
    const from = params.from;
    const to = params.to;

    const dateWhere: Prisma.VenueModerationDecisionWhereInput = {};
    if (from || to) {
      dateWhere.createdAt = {};
      if (from) dateWhere.createdAt.gte = from;
      if (to) dateWhere.createdAt.lte = to;
    }

    const venueFilter = params.importSource
      ? ({ venue: { importSource: params.importSource } } satisfies Prisma.VenueModerationDecisionWhereInput)
      : {};

    const actionWhere: Prisma.VenueModerationDecisionWhereInput = {
      ...dateWhere,
      ...venueFilter,
    };

    const signalDateWhere: Prisma.VenueModerationSignalWhereInput = {};
    if (from || to) {
      signalDateWhere.createdAt = {};
      if (from) signalDateWhere.createdAt.gte = from;
      if (to) signalDateWhere.createdAt.lte = to;
    }
    if (params.importSource) {
      signalDateWhere.importSource = params.importSource;
    }

    const venueSignalFilter: Prisma.VenueModerationSignalWhereInput = params.importSource
      ? { venue: { importSource: params.importSource } }
      : {};

    const [
      approvedTotal,
      rejectedTotal,
      mergedTotal,
      draftsTotal,
      rejectGrouped,
      signalsForHints,
      signalsForQuality,
      decisionsForSource,
    ] = await Promise.all([
      this.prisma.venueModerationDecision.count({
        where: { ...actionWhere, action: 'APPROVE' satisfies VenueModerationAction },
      }),
      this.prisma.venueModerationDecision.count({
        where: { ...actionWhere, action: 'REJECT' satisfies VenueModerationAction },
      }),
      this.prisma.venueModerationDecision.count({
        where: { ...actionWhere, action: 'MERGE' satisfies VenueModerationAction },
      }),
      this.prisma.venue.count({
        where: {
          lifecycleStatus: 'DRAFT',
          sourceType: 'IMPORTED',
          isDeleted: false,
          ...(params.importSource ? { importSource: params.importSource } : {}),
        },
      }),
      this.prisma.venueModerationDecision.groupBy({
        by: ['reasonCode'],
        where: {
          ...actionWhere,
          action: 'REJECT',
          reasonCode: { not: null },
        },
        _count: { _all: true },
      }),
      this.prisma.venueModerationSignal.findMany({
        where: { ...signalDateWhere, ...venueSignalFilter },
        select: {
          decisionHint: true,
          action: true,
          needsReview: true,
          confidenceScore: true,
          importSource: true,
          venue: { select: { importSource: true } },
        },
      }),
      this.prisma.venueModerationSignal.findMany({
        where: { ...signalDateWhere, ...venueSignalFilter },
        select: {
          needsReview: true,
          confidenceScore: true,
          importSource: true,
          venue: { select: { importSource: true } },
        },
      }),
      this.prisma.venueModerationDecision.findMany({
        where: actionWhere,
        select: {
          action: true,
          venue: { select: { importSource: true } },
        },
      }),
    ]);

    const moderatedTotal = approvedTotal + rejectedTotal + mergedTotal;
    const denom = moderatedTotal || 1;
    const rejectDenom = rejectedTotal || 1;

    const byHintCount: Record<(typeof _HINT_KEYS)[number], number> = {
      MERGE_RECOMMENDED: 0,
      APPROVE_AS_NEW: 0,
      NEEDS_REVIEW: 0,
      REJECT_RECOMMENDED: 0,
    };
    let totalWithHint = 0;
    for (const s of signalsForHints) {
      const h = s.decisionHint;
      if (!h || h === VenueDecisionHint.NO_HINT) continue;
      totalWithHint += 1;
      if (h === VenueDecisionHint.MERGE_RECOMMENDED) byHintCount.MERGE_RECOMMENDED += 1;
      else if (h === VenueDecisionHint.APPROVE_AS_NEW) byHintCount.APPROVE_AS_NEW += 1;
      else if (h === VenueDecisionHint.NEEDS_REVIEW) byHintCount.NEEDS_REVIEW += 1;
      else if (h === VenueDecisionHint.REJECT_RECOMMENDED) byHintCount.REJECT_RECOMMENDED += 1;
    }

    const hintAcceptance = {
      MERGE_RECOMMENDED: emptyHintBreakdown(),
      APPROVE_AS_NEW: emptyHintBreakdown(),
      REJECT_RECOMMENDED: emptyHintBreakdown(),
    } as VenueModerationMetricsDto['hintAcceptance'];

    for (const s of signalsForHints) {
      const h = s.decisionHint;
      if (
        h !== VenueDecisionHint.MERGE_RECOMMENDED &&
        h !== VenueDecisionHint.APPROVE_AS_NEW &&
        h !== VenueDecisionHint.REJECT_RECOMMENDED
      ) {
        continue;
      }
      const bucket = classifyVenueHintOutcome(h, s.action);
      const row = hintAcceptance[h];
      row.total += 1;
      if (bucket === 'accepted') row.accepted += 1;
      else if (bucket === 'rejected') row.rejected += 1;
      else if (bucket === 'overridden') row.overridden += 1;
    }

    const sourceKeys = new Set<string>();
    for (const s of signalsForQuality) {
      const src = (s.importSource ?? s.venue.importSource ?? 'UNKNOWN') as string;
      sourceKeys.add(src);
    }
    for (const d of decisionsForSource) {
      const src = (d.venue.importSource ?? 'UNKNOWN') as string;
      sourceKeys.add(src);
    }

    const sourceQuality: VenueModerationMetricsDto['sourceQuality'] = [];
    for (const importSourceKey of [...sourceKeys].sort()) {
      const decs = decisionsForSource.filter(
        (d) => (d.venue.importSource ?? 'UNKNOWN') === importSourceKey,
      );
      const total = decs.length;
      if (total === 0 && !signalsForQuality.some((s) => (s.importSource ?? s.venue.importSource ?? 'UNKNOWN') === importSourceKey)) {
        continue;
      }
      const ap = decs.filter((d) => d.action === 'APPROVE').length;
      const rj = decs.filter((d) => d.action === 'REJECT').length;
      const mg = decs.filter((d) => d.action === 'MERGE').length;
      const sigs = signalsForQuality.filter(
        (s) => (s.importSource ?? s.venue.importSource ?? 'UNKNOWN') === importSourceKey,
      );
      const nr = sigs.filter((s) => s.needsReview === true).length;
      const confVals = sigs
        .map((s) => s.confidenceScore)
        .filter((c): c is number => c !== null && c !== undefined && Number.isFinite(c));
      const avgConfidence = confVals.length ? confVals.reduce((a, b) => a + b, 0) / confVals.length : 0;
      const t = total || 1;
      const sigN = sigs.length || 1;
      sourceQuality.push({
        importSource: importSourceKey,
        total,
        approveRate: ap / t,
        rejectRate: rj / t,
        mergeRate: mg / t,
        needsReviewRate: nr / sigN,
        avgConfidence,
      });
    }
    sourceQuality.sort((a, b) => b.total - a.total);

    const rejectReasonsDetailed: VenueModerationMetricsDto['rejectReasonsDetailed'] = rejectGrouped
      .filter((r) => r.reasonCode)
      .map((r) => ({
        reasonCode: r.reasonCode as string,
        count: r._count._all,
        share: r._count._all / rejectDenom,
      }))
      .sort((a, b) => b.count - a.count);

    const throughput = await this.computeThroughputMs({ from, to, importSource: params.importSource });

    return {
      volume: { draftsTotal, moderatedTotal },
      counts: { approvedTotal, rejectedTotal, mergedTotal },
      rates: {
        approveRate: approvedTotal / denom,
        rejectRate: rejectedTotal / denom,
        mergeRate: mergedTotal / denom,
      },
      decisionHints: {
        totalWithHint,
        byHint: {
          MERGE_RECOMMENDED: byHintCount.MERGE_RECOMMENDED,
          APPROVE_AS_NEW: byHintCount.APPROVE_AS_NEW,
          NEEDS_REVIEW: byHintCount.NEEDS_REVIEW,
          REJECT_RECOMMENDED: byHintCount.REJECT_RECOMMENDED,
        },
      },
      hintAcceptance,
      sourceQuality,
      rejectReasonsDetailed,
      throughput,
      warnings: {
        slugCollisionRate: 0,
        staleStateRate: 0,
      },
    };
  }

  /**
   * Время от создания площадки до **первого** решения модерации (глобально),
   * только для площадок, у которых дата первого решения попадает в [from, to].
   */
  private async computeThroughputMs(params: {
    from?: Date;
    to?: Date;
    importSource?: VenueImportSource;
  }): Promise<VenueModerationMetricsDto['throughput']> {
    if (!params.from && !params.to) {
      return { timeToFirstDecisionAvgMs: null, timeToFirstDecisionP50Ms: null, timeToFirstDecisionP95Ms: null };
    }

    const from = params.from ?? new Date(0);
    const to = params.to ?? new Date(8_640_000_000_000_000);

    const whereParts: Prisma.Sql[] = [Prisma.sql`fd.first_at >= ${from}`, Prisma.sql`fd.first_at <= ${to}`];
    if (params.importSource) {
      whereParts.push(Prisma.sql`v."importSource" = ${params.importSource}`);
    }

    const rows = await this.prisma.$queryRaw<Array<{ delta_ms: number | null }>>(
      Prisma.sql`
        SELECT (EXTRACT(EPOCH FROM (fd.first_at - v."createdAt")) * 1000)::double precision AS delta_ms
        FROM (
          SELECT d."venueId" AS vid, MIN(d."createdAt") AS first_at
          FROM venue_moderation_decisions d
          GROUP BY d."venueId"
        ) fd
        INNER JOIN venues v ON v.id = fd.vid
        WHERE ${Prisma.join(whereParts, ' AND ')}
      `,
    );

    const deltas = rows
      .map((r) => Number(r.delta_ms))
      .filter((n) => Number.isFinite(n) && n >= 0)
      .sort((a, b) => a - b);
    if (deltas.length === 0) {
      return { timeToFirstDecisionAvgMs: null, timeToFirstDecisionP50Ms: null, timeToFirstDecisionP95Ms: null };
    }
    const sum = deltas.reduce((a, b) => a + b, 0);
    return {
      timeToFirstDecisionAvgMs: Math.round(sum / deltas.length),
      timeToFirstDecisionP50Ms: percentileSorted(deltas, 0.5),
      timeToFirstDecisionP95Ms: percentileSorted(deltas, 0.95),
    };
  }

  async getSourcesBreakdown(params: {
    from?: Date;
    to?: Date;
    importSource?: VenueImportSource;
  }): Promise<VenueModerationSourcesResponseDto> {
    const from = params.from;
    const to = params.to;

    const dateWhere: Prisma.VenueModerationDecisionWhereInput = {};
    if (from || to) {
      dateWhere.createdAt = {};
      if (from) dateWhere.createdAt.gte = from;
      if (to) dateWhere.createdAt.lte = to;
    }
    const venueFilter = params.importSource
      ? ({ venue: { importSource: params.importSource } } satisfies Prisma.VenueModerationDecisionWhereInput)
      : {};
    const actionWhere: Prisma.VenueModerationDecisionWhereInput = { ...dateWhere, ...venueFilter };

    const signalDateWhere: Prisma.VenueModerationSignalWhereInput = {};
    if (from || to) {
      signalDateWhere.createdAt = {};
      if (from) signalDateWhere.createdAt.gte = from;
      if (to) signalDateWhere.createdAt.lte = to;
    }
    if (params.importSource) {
      signalDateWhere.importSource = params.importSource;
    }
    const venueSignalFilter: Prisma.VenueModerationSignalWhereInput = params.importSource
      ? { venue: { importSource: params.importSource } }
      : {};

    const [decisions, signals] = await Promise.all([
      this.prisma.venueModerationDecision.findMany({
        where: actionWhere,
        select: { action: true, reasonCode: true, venue: { select: { importSource: true } } },
      }),
      this.prisma.venueModerationSignal.findMany({
        where: { ...signalDateWhere, ...venueSignalFilter },
        select: {
          needsReview: true,
          confidenceScore: true,
          importSource: true,
          venue: { select: { importSource: true, id: true } },
        },
      }),
    ]);

    const bySource = new Map<
      string,
      {
        approved: number;
        rejected: number;
        merged: number;
        needsReview: number;
        conf: number[];
        rejectByReason: Map<string, number>;
      }
    >();

    function key(src: string | null | undefined): string {
      return src ?? 'UNKNOWN';
    }

    for (const d of decisions) {
      const k = key(d.venue.importSource);
      const cur = bySource.get(k) ?? {
        approved: 0,
        rejected: 0,
        merged: 0,
        needsReview: 0,
        conf: [],
        rejectByReason: new Map<string, number>(),
      };
      if (d.action === 'APPROVE') cur.approved += 1;
      else if (d.action === 'REJECT') cur.rejected += 1;
      else if (d.action === 'MERGE') cur.merged += 1;
      bySource.set(k, cur);
    }

    for (const s of signals) {
      const k = key(s.importSource ?? s.venue.importSource);
      const cur = bySource.get(k) ?? {
        approved: 0,
        rejected: 0,
        merged: 0,
        needsReview: 0,
        conf: [],
        rejectByReason: new Map<string, number>(),
      };
      if (s.needsReview === true) cur.needsReview += 1;
      if (s.confidenceScore !== null && s.confidenceScore !== undefined && Number.isFinite(s.confidenceScore)) {
        cur.conf.push(s.confidenceScore);
      }
      bySource.set(k, cur);
    }

    const rejectRows = await this.prisma.venueModerationDecision.findMany({
      where: {
        ...actionWhere,
        action: 'REJECT',
        reasonCode: { not: null },
      },
      select: {
        reasonCode: true,
        venue: { select: { importSource: true } },
      },
    });
    for (const r of rejectRows) {
      if (!r.reasonCode) continue;
      const k = key(r.venue.importSource);
      const cur = bySource.get(k);
      if (!cur) continue;
      const prev = cur.rejectByReason.get(r.reasonCode) ?? 0;
      cur.rejectByReason.set(r.reasonCode, prev + 1);
    }

    const sources: VenueModerationSourceRowDto[] = [...bySource.entries()]
      .map(([importSource, v]) => {
        const total = v.approved + v.rejected + v.merged;
        const avgConfidence = v.conf.length ? v.conf.reduce((a, b) => a + b, 0) / v.conf.length : 0;
        const topRejectReasons = [...v.rejectByReason.entries()]
          .map(([reasonCode, count]) => ({ reasonCode, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        return {
          importSource,
          total,
          approved: v.approved,
          rejected: v.rejected,
          merged: v.merged,
          needsReview: v.needsReview,
          avgConfidence,
          topRejectReasons,
        };
      })
      .filter((s) => s.total > 0 || s.needsReview > 0)
      .sort((a, b) => b.total - a.total);

    return { sources };
  }
}
