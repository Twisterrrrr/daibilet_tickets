import { describe, expect, it, vi } from 'vitest';

import { AdminDashboardService } from '../admin-dashboard.service';
import { AnalyticsService } from '../analytics.service';
import { OperationLatencyTrackerService } from '../../common/operation-latency-tracker.service';

describe('AdminDashboardService analytics-tabs cache', () => {
  it('returns cached payload and logs hit path (no recompute)', async () => {
    const payload = {
      content: {
        qualityCards: { value: 1, suffix: '%', hint: 'h' },
        citiesCoverage: { value: 2, suffix: '', hint: 'h' },
        popularCategories: { value: 3, suffix: '', hint: 'h' },
      },
      operations: {
        recentOrders: { value: 0, suffix: '', hint: 'h' },
        paymentIssues: { value: 0, suffix: '', hint: 'h' },
        refundsAndCancels: { value: 0, suffix: '', hint: 'h' },
      },
      marketing: {
        eventsConversion: { value: 0, suffix: '%', hint: 'h' },
        promoEfficiency: { value: 0, suffix: '%', hint: 'h' },
        popularTopics: { value: 0, suffix: '', hint: 'h' },
      },
    };
    const cache = {
      get: vi.fn().mockResolvedValue(payload),
      set: vi.fn().mockResolvedValue(undefined),
    };
    const prisma = {} as never;
    const latency = new OperationLatencyTrackerService();
    const analytics = {
      computeAnalyticsTabs: vi.fn(),
    } as unknown as AnalyticsService;
    const svc = new AdminDashboardService(prisma, cache as never, latency, analytics);
    const out = await svc.getAnalyticsTabs(7, { bypassCache: false, requestId: 'r1' });
    expect(out.meta?.servedFromCache).toBe(true);
    expect(cache.get).toHaveBeenCalledWith(expect.stringMatching(/^analytics:7:[a-f0-9]{16}$/));
    expect(cache.set).not.toHaveBeenCalled();
  });
});
