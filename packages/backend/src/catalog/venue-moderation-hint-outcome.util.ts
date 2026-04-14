import type { VenueModerationAction } from '@/prisma-client';

import type { VenueDecisionHintValue } from './venue-decision-hint.util';
import { VenueDecisionHint } from './venue-decision-hint.util';

/** Исход по сравнению подсказки и фактического действия (для агрегатов hintAcceptance). */
export type VenueHintOutcomeBucket = 'accepted' | 'rejected' | 'overridden' | 'na';

/**
 * Флаги на строке VenueModerationSignal (денормализация для быстрых метрик).
 */
export function computeVenueHintSignalFlags(
  decisionHint: VenueDecisionHintValue | string | null | undefined,
  action: VenueModerationAction,
): { wasHintAccepted: boolean; wasHintOverridden: boolean } {
  const bucket = classifyVenueHintOutcome(decisionHint, action);
  return {
    wasHintAccepted: bucket === 'accepted',
    wasHintOverridden: bucket === 'overridden',
  };
}

/**
 * Классификация одной пары (hint, action) для счётчиков accepted / rejected / overridden.
 */
export function classifyVenueHintOutcome(
  decisionHint: VenueDecisionHintValue | string | null | undefined,
  action: VenueModerationAction,
): VenueHintOutcomeBucket {
  const h = decisionHint ?? null;
  if (
    h === null ||
    h === VenueDecisionHint.NO_HINT ||
    h === VenueDecisionHint.NEEDS_REVIEW ||
    h === ''
  ) {
    return 'na';
  }

  if (h === VenueDecisionHint.MERGE_RECOMMENDED) {
    if (action === 'MERGE') return 'accepted';
    if (action === 'REJECT') return 'rejected';
    if (action === 'APPROVE') return 'overridden';
    return 'na';
  }

  if (h === VenueDecisionHint.APPROVE_AS_NEW) {
    if (action === 'APPROVE') return 'accepted';
    if (action === 'REJECT') return 'rejected';
    if (action === 'MERGE') return 'overridden';
    return 'na';
  }

  if (h === VenueDecisionHint.REJECT_RECOMMENDED) {
    if (action === 'REJECT') return 'accepted';
    if (action === 'APPROVE' || action === 'MERGE') return 'overridden';
    return 'na';
  }

  return 'na';
}
