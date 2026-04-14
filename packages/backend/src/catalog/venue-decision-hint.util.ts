import type { VenueLifecycleStatus } from '@prisma/client';

import { similarity01ToLabel, type SimilarityStrength } from './venue-merge-preview.util';

/** Детерминированные подсказки оператору (не авто-действия). */
export const VenueDecisionHint = {
  MERGE_RECOMMENDED: 'MERGE_RECOMMENDED',
  APPROVE_AS_NEW: 'APPROVE_AS_NEW',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  REJECT_RECOMMENDED: 'REJECT_RECOMMENDED',
  NO_HINT: 'NO_HINT',
} as const;

export type VenueDecisionHintValue = (typeof VenueDecisionHint)[keyof typeof VenueDecisionHint];

export type VenueDecisionHintInput = {
  lifecycleStatus: VenueLifecycleStatus;
  isDeleted: boolean;
  /** Название для эвристики «мусор / пусто». */
  displayTitle: string;
  confidenceScore: number | null;
  needsReview: boolean;
  /** Число похожих кандидатов в том же городе (similarity > 0), не считая self. */
  duplicatesCount: number;
  sameCityWithBestDuplicate: boolean;
  /** Схожесть с лучшим кандидатом (если нет дублей — null). */
  bestDuplicateTitleSimilarity01: number | null;
  bestDuplicateAddressSimilarity01: number | null;
  /** Город у записи валиден (есть cityId). */
  hasCity: boolean;
  hasAddress: boolean;
};

function titleGarbage(title: string): boolean {
  const t = title.trim();
  if (t.length < 2) return true;
  if (/^[\s\p{P}\d]+$/u.test(t)) return true;
  return false;
}

function labelsFromScores(title01: number | null, addr01: number | null): {
  title: SimilarityStrength | null;
  address: SimilarityStrength | 'NONE';
} {
  if (title01 === null) return { title: null, address: addr01 === null ? 'NONE' : similarity01ToLabel(addr01) };
  const title = similarity01ToLabel(title01);
  const address: SimilarityStrength | 'NONE' =
    addr01 === null ? 'NONE' : similarity01ToLabel(addr01);
  return { title, address };
}

/**
 * Rule engine V1: без ML, только эвристики из полей и схожести с лучшим дублем.
 */
export function computeVenueDecisionHint(input: VenueDecisionHintInput): {
  decisionHint: VenueDecisionHintValue;
  decisionHintReasons: string[];
} {
  const reasons: string[] = [];

  if (input.isDeleted || input.lifecycleStatus === 'MERGED') {
    return { decisionHint: VenueDecisionHint.REJECT_RECOMMENDED, decisionHintReasons: ['SOURCE_INVALID'] };
  }

  if (input.lifecycleStatus !== 'DRAFT') {
    return { decisionHint: VenueDecisionHint.NO_HINT, decisionHintReasons: [] };
  }

  if (titleGarbage(input.displayTitle)) {
    return { decisionHint: VenueDecisionHint.REJECT_RECOMMENDED, decisionHintReasons: ['SOURCE_INVALID'] };
  }

  if (!input.hasCity) {
    return { decisionHint: VenueDecisionHint.REJECT_RECOMMENDED, decisionHintReasons: ['WRONG_CITY'] };
  }

  const conf =
    input.confidenceScore === null || Number.isNaN(input.confidenceScore)
      ? null
      : Math.max(0, Math.min(1, input.confidenceScore));

  if (conf !== null) {
    if (conf >= 0.85) reasons.push('HIGH_CONFIDENCE');
    else if (conf < 0.6) reasons.push('LOW_CONFIDENCE');
  } else {
    reasons.push('LOW_CONFIDENCE');
  }

  if (input.needsReview) reasons.push('NEEDS_REVIEW_FLAG');

  const dup = input.duplicatesCount;
  if (dup === 0) reasons.push('NO_DUPLICATES');
  else if (dup > 1) reasons.push('MULTIPLE_DUPLICATES');

  const { title: tLab, address: aLab } = labelsFromScores(
    input.bestDuplicateTitleSimilarity01,
    input.bestDuplicateAddressSimilarity01,
  );

  if (tLab === 'HIGH' || tLab === 'MEDIUM') reasons.push(`TITLE_SIMILARITY_${tLab}`);
  if (aLab !== 'NONE') reasons.push(`ADDRESS_SIMILARITY_${aLab}`);


  if (input.sameCityWithBestDuplicate && dup >= 1) reasons.push('SAME_CITY');

  // Reject: критически плохие данные
  if (conf !== null && conf < 0.25 && dup === 0 && !input.hasAddress) {
    return { decisionHint: VenueDecisionHint.REJECT_RECOMMENDED, decisionHintReasons: [...reasons, 'SOURCE_INVALID'] };
  }

  // Merge recommended
  const titleOk = tLab === 'HIGH' || tLab === 'MEDIUM';
  const addrOk = aLab === 'HIGH' || aLab === 'MEDIUM' || aLab === 'NONE';
  if (
    input.sameCityWithBestDuplicate &&
    dup >= 1 &&
    conf !== null &&
    conf >= 0.85 &&
    titleOk &&
    addrOk &&
    !input.needsReview
  ) {
    return { decisionHint: VenueDecisionHint.MERGE_RECOMMENDED, decisionHintReasons: reasons };
  }

  // Approve as new
  if (
    (conf !== null && conf < 0.6) &&
    dup === 0 &&
    input.hasCity &&
    !titleGarbage(input.displayTitle)
  ) {
    return { decisionHint: VenueDecisionHint.APPROVE_AS_NEW, decisionHintReasons: reasons };
  }

  // Needs review band
  if (
    (conf !== null && conf >= 0.6 && conf < 0.85) ||
    dup > 1 ||
    input.needsReview ||
    (tLab === 'LOW' && aLab === 'LOW')
  ) {
    return { decisionHint: VenueDecisionHint.NEEDS_REVIEW, decisionHintReasons: reasons };
  }

  if (dup >= 1 && !input.sameCityWithBestDuplicate) {
    return { decisionHint: VenueDecisionHint.NEEDS_REVIEW, decisionHintReasons: [...reasons, 'WRONG_CITY'] };
  }

  return { decisionHint: VenueDecisionHint.NO_HINT, decisionHintReasons: reasons };
}
