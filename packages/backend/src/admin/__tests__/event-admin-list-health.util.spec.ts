import { describe, expect, it } from 'vitest';

import {
  computeAdminEventQuickHealth,
  mapEventOfferToCategoryPriceDto,
  readinessFromIssueCodes,
  readinessScoreFromQuickHealth,
} from '../event-admin-list-health.util';

describe('computeAdminEventQuickHealth', () => {
  it('returns empty issueCodes when all checks pass', () => {
    const r = computeAdminEventQuickHealth({
      hasImage: true,
      hasPrice: true,
      hasFutureSessions: true,
      linksCount: 1,
      legacySubcategoryCount: 0,
    });
    expect(r.issueCodes).toHaveLength(0);
    expect(r.flags.hasSubcategory).toBe(true);
  });

  it('flags NO_PRICE when no priced layer', () => {
    const r = computeAdminEventQuickHealth({
      hasImage: true,
      hasPrice: false,
      hasFutureSessions: true,
      linksCount: 1,
      legacySubcategoryCount: 0,
    });
    expect(r.issueCodes).toContain('NO_PRICE');
    expect(readinessFromIssueCodes(r.issueCodes).readinessStatus).toBe('BLOCKED');
  });
});

describe('mapEventOfferToCategoryPriceDto', () => {
  it('marks sellable hint for active offer with price', () => {
    const row = mapEventOfferToCategoryPriceDto({
      id: 'o1',
      eventId: 'e1',
      source: 'TC' as never,
      purchaseType: 'ADULT' as never,
      externalEventId: null,
      metaEventId: null,
      deeplink: null,
      priceFrom: 150000,
      commissionPercent: null,
      priceMode: 'FIXED_PRICE' as never,
      validityMode: 'NO_EXPIRY' as never,
      validUntil: null,
      validDays: null,
      minAmount: null,
      suggestedAmounts: [],
      status: 'ACTIVE' as never,
      isPrimary: true,
      priority: 0,
      availabilityMode: null,
      badge: null,
      operatorId: null,
      widgetProvider: null,
      widgetPayload: null,
      externalData: null,
      venueId: null,
      meetingPoint: null,
      meetingInstructions: null,
      operationalPhone: null,
      operationalNote: null,
      lastSyncAt: null,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { sessions: 2 },
    } as never);
    expect(row.isSellableHint).toBe(true);
    expect(row.priceFromKopecks).toBe(150000);
  });
});

describe('readinessScoreFromQuickHealth', () => {
  it('returns 100 when all flags green', () => {
    const quick = computeAdminEventQuickHealth({
      hasImage: true,
      hasPrice: true,
      hasFutureSessions: true,
      linksCount: 1,
      legacySubcategoryCount: 0,
    });
    const score = readinessScoreFromQuickHealth({ flags: quick.flags, issueCodes: quick.issueCodes });
    expect(score).toBe(100);
  });
});
