import { describe, expect, it } from 'vitest';

import { classifyVenueHintOutcome, computeVenueHintSignalFlags } from '../venue-moderation-hint-outcome.util';
import { VenueDecisionHint } from '../venue-decision-hint.util';

describe('classifyVenueHintOutcome', () => {
  it('MERGE_RECOMMENDED: merge accepted, reject rejected, approve overridden', () => {
    expect(classifyVenueHintOutcome(VenueDecisionHint.MERGE_RECOMMENDED, 'MERGE')).toBe('accepted');
    expect(classifyVenueHintOutcome(VenueDecisionHint.MERGE_RECOMMENDED, 'REJECT')).toBe('rejected');
    expect(classifyVenueHintOutcome(VenueDecisionHint.MERGE_RECOMMENDED, 'APPROVE')).toBe('overridden');
  });

  it('APPROVE_AS_NEW: approve accepted, reject rejected, merge overridden', () => {
    expect(classifyVenueHintOutcome(VenueDecisionHint.APPROVE_AS_NEW, 'APPROVE')).toBe('accepted');
    expect(classifyVenueHintOutcome(VenueDecisionHint.APPROVE_AS_NEW, 'REJECT')).toBe('rejected');
    expect(classifyVenueHintOutcome(VenueDecisionHint.APPROVE_AS_NEW, 'MERGE')).toBe('overridden');
  });

  it('REJECT_RECOMMENDED: reject accepted; approve/merge overridden', () => {
    expect(classifyVenueHintOutcome(VenueDecisionHint.REJECT_RECOMMENDED, 'REJECT')).toBe('accepted');
    expect(classifyVenueHintOutcome(VenueDecisionHint.REJECT_RECOMMENDED, 'APPROVE')).toBe('overridden');
    expect(classifyVenueHintOutcome(VenueDecisionHint.REJECT_RECOMMENDED, 'MERGE')).toBe('overridden');
  });

  it('NO_HINT / NEEDS_REVIEW → na', () => {
    expect(classifyVenueHintOutcome(VenueDecisionHint.NO_HINT, 'APPROVE')).toBe('na');
    expect(classifyVenueHintOutcome(VenueDecisionHint.NEEDS_REVIEW, 'MERGE')).toBe('na');
  });
});

describe('computeVenueHintSignalFlags', () => {
  it('maps accepted/overridden', () => {
    expect(computeVenueHintSignalFlags(VenueDecisionHint.MERGE_RECOMMENDED, 'MERGE')).toEqual({
      wasHintAccepted: true,
      wasHintOverridden: false,
    });
    expect(computeVenueHintSignalFlags(VenueDecisionHint.MERGE_RECOMMENDED, 'APPROVE')).toEqual({
      wasHintAccepted: false,
      wasHintOverridden: true,
    });
  });
});
