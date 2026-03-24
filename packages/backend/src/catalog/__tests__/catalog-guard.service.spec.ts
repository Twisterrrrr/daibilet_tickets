import { describe, expect, it } from 'vitest';
import { DateMode, OfferStatus, PriceMode } from '@prisma/client';

import { CatalogGuardService } from '../catalog-guard.service';

describe('CatalogGuardService', () => {
  const guard = new CatalogGuardService({} as never);

  it('sellable: scheduled with venue, active offer price, future session', () => {
    const now = new Date('2026-03-01T12:00:00.000Z');
    const r = guard.evaluateSellable(
      {
        category: 'EXCURSION',
        audience: 'ALL',
        dateMode: DateMode.SCHEDULED,
        venueId: 'v1',
        address: null,
        meetingPoint: null,
      },
      [
        {
          status: OfferStatus.ACTIVE,
          isDeleted: false,
          priceFrom: 10000,
          priceMode: PriceMode.FIXED_PRICE,
        },
      ],
      [{ isActive: true, startsAt: new Date('2026-03-02T12:00:00.000Z') }],
      now,
    );
    expect(r.sellable).toBe(true);
    expect(r.reasons).toHaveLength(0);
  });

  it('not sellable: no sessions for scheduled', () => {
    const now = new Date('2026-03-01T12:00:00.000Z');
    const r = guard.evaluateSellable(
      {
        category: 'EXCURSION',
        audience: 'ALL',
        dateMode: DateMode.SCHEDULED,
        venueId: 'v1',
      },
      [
        {
          status: OfferStatus.ACTIVE,
          isDeleted: false,
          priceFrom: 10000,
          priceMode: PriceMode.FIXED_PRICE,
        },
      ],
      [],
      now,
    );
    expect(r.sellable).toBe(false);
    expect(r.reasons).toContain('NO_SESSIONS');
  });
});
