import type { VenueImportSource } from '@prisma/client';

import type { VenueAutoDecisionThresholds } from './venue-auto-decision.config';
import { VenueDecisionHint, type VenueDecisionHintValue } from './venue-decision-hint.util';
import { similarity01ToLabel, type SimilarityStrength } from './venue-merge-preview.util';

export type VenueAutoDecision =
  | { action: 'AUTO_APPROVE' }
  | { action: 'AUTO_MERGE'; targetVenueId: string }
  | { action: 'NO_AUTO'; reason: string };

export type VenueAutoDecisionInput = {
  confidenceScore: number | null;
  decisionHint: VenueDecisionHintValue;
  decisionHintReasons: string[];
  /** Количество дубликатов-кандидатов (для merge должен быть ровно один целевой канон). */
  duplicatesCount: number;
  /** Канонический target для merge, если duplicatesCount === 1 и выбран лучший. */
  mergeTargetVenueId: string | null;
  titleSimilarity01: number | null;
  addressSimilarity01: number | null;
  sameCity: boolean;
  needsReview: boolean;
  importSource: VenueImportSource | null;
  historicalSourceQuality?: { rejectRate: number } | null;
  thresholds: VenueAutoDecisionThresholds;
};

const STRENGTH_RANK: Record<SimilarityStrength, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

function strengthAtLeast(label: SimilarityStrength, min: 'MEDIUM' | 'HIGH'): boolean {
  const need = STRENGTH_RANK[min];
  return STRENGTH_RANK[label] >= need;
}

function labelFrom01(score: number | null): SimilarityStrength {
  if (score === null) return 'LOW';
  return similarity01ToLabel(score);
}

/**
 * Rule-based авто-решение V1. Пороги передаются из конфига (env).
 */
export function evaluateVenueAutoDecision(input: VenueAutoDecisionInput): VenueAutoDecision {
  const t = input.thresholds;
  const conf = input.confidenceScore;

  if (input.needsReview) {
    return { action: 'NO_AUTO', reason: 'NEEDS_REVIEW_FLAG' };
  }

  // --- AUTO_MERGE ---
  if (input.decisionHint === VenueDecisionHint.MERGE_RECOMMENDED) {
    if (conf === null || Number.isNaN(conf)) {
      return { action: 'NO_AUTO', reason: 'MISSING_CONFIDENCE' };
    }
    if (conf < t.mergeMinConfidence) {
      return { action: 'NO_AUTO', reason: 'CONFIDENCE_BELOW_MERGE_THRESHOLD' };
    }
    if (!input.sameCity) {
      return { action: 'NO_AUTO', reason: 'NOT_SAME_CITY' };
    }
    if (input.duplicatesCount !== 1 || !input.mergeTargetVenueId) {
      return { action: 'NO_AUTO', reason: 'MERGE_TARGET_NOT_UNIQUE' };
    }
    const titleL = labelFrom01(input.titleSimilarity01);
    const addrL = labelFrom01(input.addressSimilarity01);
    if (!strengthAtLeast(titleL, t.mergeTitleMinStrength)) {
      return { action: 'NO_AUTO', reason: 'TITLE_SIMILARITY_TOO_LOW' };
    }
    if (!strengthAtLeast(addrL, t.mergeAddressMinStrength)) {
      return { action: 'NO_AUTO', reason: 'ADDRESS_SIMILARITY_TOO_LOW' };
    }
    return { action: 'AUTO_MERGE', targetVenueId: input.mergeTargetVenueId };
  }

  // --- AUTO_APPROVE ---
  if (input.decisionHint === VenueDecisionHint.APPROVE_AS_NEW) {
    if (conf === null || Number.isNaN(conf)) {
      return { action: 'NO_AUTO', reason: 'MISSING_CONFIDENCE' };
    }
    if (conf > t.approveMaxConfidence) {
      return { action: 'NO_AUTO', reason: 'CONFIDENCE_ABOVE_APPROVE_THRESHOLD' };
    }
    if (input.duplicatesCount !== 0) {
      return { action: 'NO_AUTO', reason: 'DUPLICATES_PRESENT' };
    }
    const rr = input.historicalSourceQuality?.rejectRate;
    if (rr !== undefined && rr !== null && (Number.isNaN(rr) || rr >= t.approveMaxRejectRate)) {
      return { action: 'NO_AUTO', reason: 'SOURCE_REJECT_RATE_TOO_HIGH' };
    }
    return { action: 'AUTO_APPROVE' };
  }

  return { action: 'NO_AUTO', reason: 'HINT_NOT_AUTO_ELIGIBLE' };
}
