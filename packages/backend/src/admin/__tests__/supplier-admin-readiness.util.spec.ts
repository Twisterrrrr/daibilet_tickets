import { describe, expect, it } from 'vitest';

import { computeSupplierAdminReadiness } from '../supplier-admin-readiness.util';

const base = {
  name: 'ООО Тест',
  isActive: true,
  status: 'ACTIVE',
  trustLevel: 2,
  listingHealthScore: 80,
  eventsCount: 5,
  activeEventsCount: 4,
  blockedEventsCount: 0,
  usersCount: 2,
  hasOwner: true,
  legalStatus: 'VERIFIED' as const,
  hasLegalProfile: true,
  pendingSettlementsCount: 0,
  documentsDraftCount: 0,
  commissionRate: 0.25,
};

describe('computeSupplierAdminReadiness', () => {
  it('BLOCKED when suspended', () => {
    const r = computeSupplierAdminReadiness({ ...base, status: 'SUSPENDED' });
    expect(r.status).toBe('BLOCKED');
  });

  it('BLOCKED when no owner', () => {
    const r = computeSupplierAdminReadiness({ ...base, hasOwner: false, usersCount: 1 });
    expect(r.status).toBe('BLOCKED');
    expect(r.blockers.some((b) => b.includes('OWNER'))).toBe(true);
  });

  it('NEEDS_WORK when legal draft', () => {
    const r = computeSupplierAdminReadiness({
      ...base,
      legalStatus: 'DRAFT',
      hasLegalProfile: true,
    });
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('keySignals capped', () => {
    const r = computeSupplierAdminReadiness({
      ...base,
      listingHealthScore: 10,
      hasOwner: true,
    });
    expect(r.keySignals.length).toBeLessThanOrEqual(3);
  });
});
