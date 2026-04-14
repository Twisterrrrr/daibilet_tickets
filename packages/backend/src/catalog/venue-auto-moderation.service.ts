import { Injectable, Logger } from '@nestjs/common';
import type { Prisma, VenueImportSource } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import {
  buildAutoModerationDecisionExtra,
  getVenueAutoApproveMinTrustLevel,
  getVenueAutoDecisionThresholdsSnapshot,
  getVenueAutoMergeMinTrustLevel,
  getVenueAutoModerationEnvFlags,
  getVenueAutoOnlyHighConfidenceMin,
  isVenueAutoShadowMode,
  trustLevelMeetsMinimum,
  type VenueAutoDecisionThresholds,
} from './venue-auto-decision.config';
import { evaluateVenueAutoDecision, type VenueAutoDecision } from './venue-auto-decision.util';
import { buildApproveDraftInputForPreview } from './venue-batch-approve-preview.util';
import { computeVenueDecisionHint } from './venue-decision-hint.util';
import { mergePreviewAddressSimilarity01, mergePreviewTitleSimilarity01 } from './venue-merge-preview.util';
import { VenueLifecycleService } from './venue-lifecycle.service';
import { VenueModerationMetricsService } from './venue-moderation-metrics.service';
import { VenueTrustService } from './venue-trust.service';

export type AutoModerationDryRunParams = {
  from?: Date;
  to?: Date;
  importSource?: VenueImportSource;
  limit?: number;
};

export type AutoModerationDryRunResult = {
  totalEvaluated: number;
  autoApproveCandidates: number;
  autoMergeCandidates: number;
  samples: Array<{
    venueId: string;
    decision: VenueAutoDecision;
    reasons: string[];
    confidenceScore: number | null;
  }>;
};

export type AutoModerationRunParams = {
  limit: number;
  importSource?: VenueImportSource;
  onlyHighConfidence?: boolean;
};

export type AutoModerationRunResult = {
  processed: number;
  autoApproved: number;
  autoMerged: number;
  skipped: number;
  errors: string[];
  shadow: boolean;
};

@Injectable()
export class VenueAutoModerationService {
  private readonly log = new Logger(VenueAutoModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: VenueLifecycleService,
    private readonly metrics: VenueModerationMetricsService,
    private readonly trust: VenueTrustService,
  ) {}

  private startOfUtcDay(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }

  private async countAutoActionsTodayForSource(importSource: VenueImportSource | null): Promise<number> {
    if (!importSource) return 0;
    const dayStart = this.startOfUtcDay(new Date());
    return this.prisma.venueModerationDecision.count({
      where: {
        createdAt: { gte: dayStart },
        venue: { importSource },
        metadata: { path: ['isAuto'], equals: true },
      },
    });
  }

  private async getRejectRateForSource(importSource: VenueImportSource | null): Promise<number | null> {
    if (!importSource) return null;
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const m = await this.metrics.getMetrics({ from, to, importSource });
    const row = m.sourceQuality.find((x) => x.importSource === importSource);
    return row?.rejectRate ?? m.rates.rejectRate;
  }

  /**
   * Оценка одного DRAFT: те же входы, что и у approveDraft для hint / duplicates.
   */
  async evaluateCandidate(
    venueId: string,
    thresholds?: VenueAutoDecisionThresholds,
  ): Promise<{
    venueId: string;
    decision: VenueAutoDecision;
    reasons: string[];
    confidenceScore: number | null;
    decisionHint: string;
    decisionHintReasons: string[];
  }> {
    const t = thresholds ?? getVenueAutoDecisionThresholdsSnapshot();
    const v = await this.prisma.venue.findUnique({ where: { id: venueId } });
    if (!v || v.lifecycleStatus !== 'DRAFT' || v.isDeleted) {
      return {
        venueId,
        decision: { action: 'NO_AUTO', reason: 'NOT_DRAFT_OR_MISSING' },
        reasons: [],
        confidenceScore: null,
        decisionHint: 'NO_HINT',
        decisionHintReasons: [],
      };
    }

    const similar = await this.lifecycle.findSimilarDrafts(venueId, { limit: 10 });
    const dupItems = similar.items;
    const dupCount = dupItems.length;
    const top = dupItems[0];
    const dispAddr = (addr: string | null, raw: string | null) => addr?.trim() || raw?.trim() || null;
    const t01 = top ? mergePreviewTitleSimilarity01(v.title, top.title) : null;
    const a01 = top
      ? mergePreviewAddressSimilarity01(dispAddr(v.address, v.rawAddress), top.address)
      : null;

    const confRaw = v.confidenceScore;
    const conf =
      confRaw === null || confRaw === undefined ? null : typeof confRaw === 'number' ? confRaw : Number(confRaw);
    const confidenceScore = conf !== null && Number.isFinite(conf) ? conf : null;

    const hint = computeVenueDecisionHint({
      lifecycleStatus: v.lifecycleStatus,
      isDeleted: v.isDeleted,
      displayTitle: v.title,
      confidenceScore,
      needsReview: v.needsReview,
      duplicatesCount: dupCount,
      sameCityWithBestDuplicate: dupCount > 0,
      bestDuplicateTitleSimilarity01: t01,
      bestDuplicateAddressSimilarity01: a01,
      hasCity: Boolean(v.cityId),
      hasAddress: Boolean(dispAddr(v.address, v.rawAddress)),
    });

    const mergeTargetVenueId = dupCount === 1 && top ? top.id : null;
    const sameCity = dupCount >= 1 && Boolean(v.cityId);
    const rr = await this.getRejectRateForSource(v.importSource);
    const historicalSourceQuality = rr !== null && !Number.isNaN(rr) ? { rejectRate: rr } : null;

    const decision = evaluateVenueAutoDecision({
      confidenceScore,
      decisionHint: hint.decisionHint,
      decisionHintReasons: hint.decisionHintReasons,
      duplicatesCount: dupCount,
      mergeTargetVenueId,
      titleSimilarity01: t01,
      addressSimilarity01: a01,
      sameCity,
      needsReview: v.needsReview,
      importSource: v.importSource,
      historicalSourceQuality,
      thresholds: t,
    });

    const reasons =
      decision.action === 'NO_AUTO'
        ? [decision.reason]
        : decision.action === 'AUTO_MERGE'
          ? ['AUTO_MERGE', ...hint.decisionHintReasons]
          : ['AUTO_APPROVE', ...hint.decisionHintReasons];

    return {
      venueId,
      decision,
      reasons,
      confidenceScore,
      decisionHint: hint.decisionHint,
      decisionHintReasons: hint.decisionHintReasons,
    };
  }

  async runDryRun(params: AutoModerationDryRunParams): Promise<AutoModerationDryRunResult> {
    const limit = Math.min(Math.max(params.limit ?? 200, 1), 500);
    const thresholds = getVenueAutoDecisionThresholdsSnapshot();

    const where: Prisma.VenueWhereInput = {
      lifecycleStatus: 'DRAFT',
      isDeleted: false,
      sourceType: 'IMPORTED',
    };
    if (params.importSource) where.importSource = params.importSource;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }

    const rows = await this.prisma.venue.findMany({
      where,
      select: { id: true },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });

    let autoApproveCandidates = 0;
    let autoMergeCandidates = 0;
    const samples: AutoModerationDryRunResult['samples'] = [];
    const maxSamples = 50;

    for (const row of rows) {
      const ev = await this.evaluateCandidate(row.id, thresholds);
      if (ev.decision.action === 'AUTO_APPROVE') autoApproveCandidates += 1;
      else if (ev.decision.action === 'AUTO_MERGE') autoMergeCandidates += 1;

      if (samples.length < maxSamples && ev.decision.action !== 'NO_AUTO') {
        samples.push({
          venueId: ev.venueId,
          decision: ev.decision,
          reasons: ev.reasons,
          confidenceScore: ev.confidenceScore,
        });
      }
    }

    return {
      totalEvaluated: rows.length,
      autoApproveCandidates,
      autoMergeCandidates,
      samples,
    };
  }

  async runAutoDecisionsForDrafts(params: AutoModerationRunParams): Promise<AutoModerationRunResult> {
    const flags = getVenueAutoModerationEnvFlags();
    const thresholds = getVenueAutoDecisionThresholdsSnapshot();
    const shadow = isVenueAutoShadowMode();
    const errors: string[] = [];
    let processed = 0;
    let autoApproved = 0;
    let autoMerged = 0;
    let skipped = 0;
    let consecutiveMerges = 0;
    let actionsThisRun = 0;

    const minMergeTrust = getVenueAutoMergeMinTrustLevel();
    const minApproveTrust = getVenueAutoApproveMinTrustLevel();
    const onlyHighMin = getVenueAutoOnlyHighConfidenceMin();

    const where: Prisma.VenueWhereInput = {
      lifecycleStatus: 'DRAFT',
      isDeleted: false,
      sourceType: 'IMPORTED',
    };
    if (params.importSource) where.importSource = params.importSource;

    const rows = await this.prisma.venue.findMany({
      where,
      select: { id: true },
      orderBy: { updatedAt: 'asc' },
      take: Math.min(Math.max(params.limit, 1), 500),
    });

    for (const row of rows) {
      if (actionsThisRun >= thresholds.maxActionsPerRun) break;

      const ev = await this.evaluateCandidate(row.id, thresholds);
      processed += 1;

      if (ev.decision.action === 'NO_AUTO') {
        skipped += 1;
        continue;
      }

      if (params.onlyHighConfidence && (ev.confidenceScore === null || ev.confidenceScore < onlyHighMin)) {
        skipped += 1;
        continue;
      }

      const v = await this.prisma.venue.findUnique({
        where: { id: row.id },
        select: {
          id: true,
          updatedAt: true,
          importSource: true,
          title: true,
          address: true,
          rawName: true,
          rawAddress: true,
          slug: true,
        },
      });
      if (!v?.importSource) {
        skipped += 1;
        continue;
      }

      const profile = await this.trust.getProfile(v.importSource);
      if (profile.disabled) {
        skipped += 1;
        continue;
      }

      if (ev.decision.action === 'AUTO_MERGE') {
        if (!flags.autoMergeEnabled) {
          skipped += 1;
          continue;
        }
        if (!profile.autoMergeEnabled) {
          skipped += 1;
          continue;
        }
        if (!trustLevelMeetsMinimum(profile.trustLevel, minMergeTrust)) {
          skipped += 1;
          continue;
        }
        if (consecutiveMerges >= thresholds.maxConsecutiveMerges) {
          skipped += 1;
          continue;
        }
        const usedToday = await this.countAutoActionsTodayForSource(v.importSource);
        if (usedToday >= profile.maxAutoActionsPerDay) {
          skipped += 1;
          continue;
        }
      }

      if (ev.decision.action === 'AUTO_APPROVE') {
        if (!flags.autoApproveEnabled) {
          skipped += 1;
          continue;
        }
        if (!profile.autoApproveEnabled) {
          skipped += 1;
          continue;
        }
        if (!trustLevelMeetsMinimum(profile.trustLevel, minApproveTrust)) {
          skipped += 1;
          continue;
        }
        const usedToday = await this.countAutoActionsTodayForSource(v.importSource);
        if (usedToday >= profile.maxAutoActionsPerDay) {
          skipped += 1;
          continue;
        }
      }

      const extra = buildAutoModerationDecisionExtra({
        autoDecisionType: ev.decision.action,
        autoDecisionReasons: ev.reasons,
        confidenceScore: ev.confidenceScore,
        thresholdsSnapshot: thresholds,
      }) as Prisma.InputJsonValue;

      if (shadow) {
        skipped += 1;
        this.log.log(
          `shadow auto ${ev.decision.action} venue=${row.id} src=${v.importSource} (not applied)`,
        );
        continue;
      }

      try {
        if (ev.decision.action === 'AUTO_APPROVE') {
          const input = buildApproveDraftInputForPreview(v);
          await this.lifecycle.approveDraft(row.id, input, {
            actorAdminId: null,
            expectedUpdatedAt: v.updatedAt.toISOString(),
            moderationDecisionExtra: extra,
          });
          autoApproved += 1;
          actionsThisRun += 1;
          consecutiveMerges = 0;
        } else if (ev.decision.action === 'AUTO_MERGE') {
          const targetId = ev.decision.targetVenueId;
          const tgt = await this.prisma.venue.findUnique({
            where: { id: targetId },
            select: { updatedAt: true },
          });
          if (!tgt) {
            errors.push(`${row.id}: merge target missing`);
            skipped += 1;
            continue;
          }
          await this.lifecycle.mergeInto(row.id, targetId, {
            actorAdminId: null,
            expectedSourceUpdatedAt: v.updatedAt.toISOString(),
            expectedTargetUpdatedAt: tgt.updatedAt.toISOString(),
            moderationDecisionExtra: extra,
          });
          autoMerged += 1;
          actionsThisRun += 1;
          consecutiveMerges += 1;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${row.id}: ${msg}`);
        this.log.warn(`auto-moderation failed venue=${row.id}: ${msg}`);
        skipped += 1;
        consecutiveMerges = 0;
      }
    }

    return { processed, autoApproved, autoMerged, skipped, errors, shadow };
  }
}
