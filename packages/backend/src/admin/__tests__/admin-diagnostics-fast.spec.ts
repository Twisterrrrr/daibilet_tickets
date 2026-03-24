import { describe, expect, it, vi } from 'vitest';

import { AdminDiagnosticsService } from '../admin-diagnostics.service';

describe('AdminDiagnosticsService getFastDiagnostics', () => {
  it('returns catalog, collections and landings sections', async () => {
    const prisma = {
      event: {
        count: vi.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3).mockResolvedValueOnce(4),
      },
    };
    const cache = {
      get: vi.fn().mockResolvedValue(null),
    };
    const svc = new AdminDiagnosticsService(prisma as never, cache as never);
    const out = await svc.getFastDiagnostics();
    expect(out.catalog).toMatchObject({
      totalEvents: 10,
      withoutSubcategories: 1,
      withoutLocation: 2,
      withoutOffers: 3,
      withoutSessions: 4,
    });
    expect(out.collections).toHaveProperty('emptyCollections');
    expect(out.landings).toHaveProperty('emptyLandings');
    expect(out.meta).toMatchObject({ emptyFromConsistencyCache: false });
  });
});
