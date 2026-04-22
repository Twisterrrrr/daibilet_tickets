import { Injectable } from '@nestjs/common';
import type { ImportSourceModerationProfile, VenueImportSource, VenueModerationTrustLevel } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';

import { VenueModerationMetricsService } from './venue-moderation-metrics.service';
import { VenueDecisionHint } from './venue-decision-hint.util';

export type ImportSourceTrustOverviewRow = {
  importSource: string;
  profile: {
    trustLevel: VenueModerationTrustLevel;
    autoApproveEnabled: boolean;
    autoMergeEnabled: boolean;
    maxAutoActionsPerDay: number;
    disabled: boolean;
  };
  suggestedTrustLevel: VenueModerationTrustLevel;
  metrics: {
    rejectRate: number;
    hintAcceptanceMerge: number | null;
    hintAcceptanceApprove: number | null;
    avgConfidence: number;
    totalDecisions: number;
  };
};

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Вычисление уровня доверия по метрикам (полу-ручной режим: профиль в БД может отличаться).
 */
@Injectable()
export class VenueTrustService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: VenueModerationMetricsService,
  ) {}

  /** Профиль из БД или дефолты (без строки в таблице). */
  async getProfile(importSource: VenueImportSource): Promise<ImportSourceModerationProfile> {
    const row = await this.prisma.importSourceModerationProfile.findUnique({ where: { importSource } });
    if (row) return row;
    return {
      importSource,
      trustLevel: 'LOW',
      autoApproveEnabled: false,
      autoMergeEnabled: false,
      maxAutoActionsPerDay: 20,
      disabled: false,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    } as ImportSourceModerationProfile;
  }

  /**
   * Предлагаемый trust по reject rate и принятию подсказок (30 д окно; FULL_AUTO — по окну 7 д + объём).
   */
  async computeSuggestedTrustLevel(importSource: VenueImportSource): Promise<VenueModerationTrustLevel> {
    const to = new Date();
    const from30 = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const from7 = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

    const m30 = await this.metrics.getMetrics({ from: from30, to, importSource });
    if (m30.volume.moderatedTotal === 0) return 'LOW';

    const rr = m30.rates.rejectRate;
    const mergeAcc = m30.hintAcceptance[VenueDecisionHint.MERGE_RECOMMENDED];
    const apprAcc = m30.hintAcceptance[VenueDecisionHint.APPROVE_AS_NEW];
    const mergeDenom = mergeAcc.accepted + mergeAcc.rejected + mergeAcc.overridden;
    const apprDenom = apprAcc.accepted + apprAcc.rejected + apprAcc.overridden;
    const mergeHintRate = mergeDenom > 0 ? mergeAcc.accepted / mergeDenom : null;
    const apprHintRate = apprDenom > 0 ? apprAcc.accepted / apprDenom : null;

    let base: VenueModerationTrustLevel = 'LOW';
    if (rr > 0.25) {
      base = 'LOW';
    } else if (rr >= 0.1) {
      base = 'MEDIUM';
    } else {
      const hasHintSignal =
        mergeDenom + apprDenom > 0 &&
        ((mergeHintRate !== null && mergeHintRate > 0.8) || (apprHintRate !== null && apprHintRate > 0.8));
      base = hasHintSignal ? 'HIGH' : 'MEDIUM';
    }

    const m7 = await this.metrics.getMetrics({ from: from7, to, importSource });
    const minDecisions = envInt('VENUE_AUTO_FULL_AUTO_MIN_DECISIONS', 20);
    if (base === 'HIGH' && m7.volume.moderatedTotal >= minDecisions) {
      return 'FULL_AUTO';
    }
    return base;
  }

  async getImportSourceTrustOverview(): Promise<ImportSourceTrustOverviewRow[]> {
    const sources: VenueImportSource[] = ['TICKETSCLOUD', 'TEPLOHOD'];
    const out: ImportSourceTrustOverviewRow[] = [];
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const importSource of sources) {
      const profile = await this.getProfile(importSource);
      const m = await this.metrics.getMetrics({ from, to, importSource });
      const mergeAcc = m.hintAcceptance[VenueDecisionHint.MERGE_RECOMMENDED];
      const apprAcc = m.hintAcceptance[VenueDecisionHint.APPROVE_AS_NEW];
      const mergeDenom = mergeAcc.accepted + mergeAcc.rejected + mergeAcc.overridden;
      const apprDenom = apprAcc.accepted + apprAcc.rejected + apprAcc.overridden;
      const mergeHintRate = mergeDenom > 0 ? mergeAcc.accepted / mergeDenom : null;
      const apprHintRate = apprDenom > 0 ? apprAcc.accepted / apprDenom : null;

      const sq = m.sourceQuality.find((x) => x.importSource === importSource);
      const suggested = await this.computeSuggestedTrustLevel(importSource);

      out.push({
        importSource,
        profile: {
          trustLevel: profile.trustLevel,
          autoApproveEnabled: profile.autoApproveEnabled,
          autoMergeEnabled: profile.autoMergeEnabled,
          maxAutoActionsPerDay: profile.maxAutoActionsPerDay,
          disabled: profile.disabled,
        },
        suggestedTrustLevel: suggested,
        metrics: {
          rejectRate: sq?.rejectRate ?? m.rates.rejectRate,
          hintAcceptanceMerge: mergeHintRate,
          hintAcceptanceApprove: apprHintRate,
          avgConfidence: sq?.avgConfidence ?? 0,
          totalDecisions: m.volume.moderatedTotal,
        },
      });
    }

    return out;
  }
}
