import { describe, expect, it } from 'vitest';

import { ReviewCapabilityService } from '../review-capability.service';

describe('ReviewCapabilityService', () => {
  const service = new ReviewCapabilityService();

  describe('canAcceptReviews', () => {
    it('returns false for TC source', () => {
      expect(service.canAcceptReviews({ source: 'TC' })).toBe(false);
      expect(service.canAcceptReviews({ source: 'TC', supplierId: 'id', operatorId: 'id' })).toBe(false);
    });

    it('returns false for TEPLOHOD source', () => {
      expect(service.canAcceptReviews({ source: 'TEPLOHOD' })).toBe(false);
      expect(service.canAcceptReviews({ source: 'TEPLOHOD', operatorId: 'id' })).toBe(false);
    });

    it('returns false for MANUAL without owner', () => {
      expect(service.canAcceptReviews({ source: 'MANUAL' })).toBe(false);
      expect(service.canAcceptReviews({ source: 'MANUAL', supplierId: null, operatorId: null })).toBe(false);
    });

    it('returns true for MANUAL with supplierId', () => {
      expect(service.canAcceptReviews({ source: 'MANUAL', supplierId: 'op-1' })).toBe(true);
    });

    it('returns true for MANUAL with operatorId', () => {
      expect(service.canAcceptReviews({ source: 'MANUAL', operatorId: 'op-1' })).toBe(true);
    });

    it('returns true for MANUAL with both supplierId and operatorId', () => {
      expect(service.canAcceptReviews({ source: 'MANUAL', supplierId: 's1', operatorId: 'o1' })).toBe(true);
    });
  });

  describe('isImportedAggregatorEvent', () => {
    it('returns true for TC', () => {
      expect(service.isImportedAggregatorEvent({ source: 'TC' })).toBe(true);
    });

    it('returns true for TEPLOHOD', () => {
      expect(service.isImportedAggregatorEvent({ source: 'TEPLOHOD' })).toBe(true);
    });

    it('returns false for MANUAL', () => {
      expect(service.isImportedAggregatorEvent({ source: 'MANUAL' })).toBe(false);
    });
  });

  describe('requiresSupplierResponse', () => {
    it('returns true for rating 1–3', () => {
      expect(service.requiresSupplierResponse(1)).toBe(true);
      expect(service.requiresSupplierResponse(2)).toBe(true);
      expect(service.requiresSupplierResponse(3)).toBe(true);
    });

    it('returns false for rating 4–5', () => {
      expect(service.requiresSupplierResponse(4)).toBe(false);
      expect(service.requiresSupplierResponse(5)).toBe(false);
    });

    it('returns false for rating 0', () => {
      expect(service.requiresSupplierResponse(0)).toBe(false);
    });
  });
});
