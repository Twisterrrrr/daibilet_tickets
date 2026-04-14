import { describe, expect, it } from 'vitest';

import type { VenueAutoDecisionThresholds } from '../venue-auto-decision.config';
import { evaluateVenueAutoDecision } from '../venue-auto-decision.util';
import { VenueDecisionHint } from '../venue-decision-hint.util';

const baseThresholds = (): VenueAutoDecisionThresholds => ({
  mergeMinConfidence: 0.92,
  mergeTitleMinStrength: 'MEDIUM',
  mergeAddressMinStrength: 'MEDIUM',
  approveMaxConfidence: 0.5,
  approveMaxRejectRate: 0.2,
  maxActionsPerRun: 50,
  maxConsecutiveMerges: 5,
});

describe('evaluateVenueAutoDecision', () => {
  it('AUTO_MERGE when merge rules satisfied', () => {
    const r = evaluateVenueAutoDecision({
      confidenceScore: 0.95,
      decisionHint: VenueDecisionHint.MERGE_RECOMMENDED,
      decisionHintReasons: [],
      duplicatesCount: 1,
      mergeTargetVenueId: 'target-uuid',
      titleSimilarity01: 0.9,
      addressSimilarity01: 0.85,
      sameCity: true,
      needsReview: false,
      importSource: 'TICKETSCLOUD',
      historicalSourceQuality: { rejectRate: 0.05 },
      thresholds: baseThresholds(),
    });
    expect(r).toEqual({ action: 'AUTO_MERGE', targetVenueId: 'target-uuid' });
  });

  it('NO_AUTO merge when confidence below threshold', () => {
    const r = evaluateVenueAutoDecision({
      confidenceScore: 0.9,
      decisionHint: VenueDecisionHint.MERGE_RECOMMENDED,
      decisionHintReasons: [],
      duplicatesCount: 1,
      mergeTargetVenueId: 't',
      titleSimilarity01: 0.9,
      addressSimilarity01: 0.85,
      sameCity: true,
      needsReview: false,
      importSource: 'TICKETSCLOUD',
      thresholds: baseThresholds(),
    });
    expect(r).toEqual({ action: 'NO_AUTO', reason: 'CONFIDENCE_BELOW_MERGE_THRESHOLD' });
  });

  it('AUTO_APPROVE when approve rules satisfied', () => {
    const r = evaluateVenueAutoDecision({
      confidenceScore: 0.45,
      decisionHint: VenueDecisionHint.APPROVE_AS_NEW,
      decisionHintReasons: [],
      duplicatesCount: 0,
      mergeTargetVenueId: null,
      titleSimilarity01: null,
      addressSimilarity01: null,
      sameCity: false,
      needsReview: false,
      importSource: 'TICKETSCLOUD',
      historicalSourceQuality: { rejectRate: 0.1 },
      thresholds: baseThresholds(),
    });
    expect(r).toEqual({ action: 'AUTO_APPROVE' });
  });

  it('NO_AUTO approve when reject rate too high', () => {
    const r = evaluateVenueAutoDecision({
      confidenceScore: 0.4,
      decisionHint: VenueDecisionHint.APPROVE_AS_NEW,
      decisionHintReasons: [],
      duplicatesCount: 0,
      mergeTargetVenueId: null,
      titleSimilarity01: null,
      addressSimilarity01: null,
      sameCity: false,
      needsReview: false,
      importSource: 'TICKETSCLOUD',
      historicalSourceQuality: { rejectRate: 0.25 },
      thresholds: baseThresholds(),
    });
    expect(r).toEqual({ action: 'NO_AUTO', reason: 'SOURCE_REJECT_RATE_TOO_HIGH' });
  });

  it('NO_AUTO when needsReview', () => {
    const r = evaluateVenueAutoDecision({
      confidenceScore: 0.95,
      decisionHint: VenueDecisionHint.MERGE_RECOMMENDED,
      decisionHintReasons: [],
      duplicatesCount: 1,
      mergeTargetVenueId: 't',
      titleSimilarity01: 0.9,
      addressSimilarity01: 0.85,
      sameCity: true,
      needsReview: true,
      importSource: 'TICKETSCLOUD',
      thresholds: baseThresholds(),
    });
    expect(r).toEqual({ action: 'NO_AUTO', reason: 'NEEDS_REVIEW_FLAG' });
  });
});
