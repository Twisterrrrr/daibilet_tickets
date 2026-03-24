import { describe, expect, it } from 'vitest';

import { PaymentMetricsService } from '../../checkout/payment-metrics.service';
import { OperationLatencyTrackerService } from '../../common/operation-latency-tracker.service';
import { AdminOpsController } from '../admin-ops.controller';

describe('AdminOpsController getMetrics (shape)', () => {
  it('includes latency.byMetric, named computes, system.uptime and counters', async () => {
    const metrics = new PaymentMetricsService();
    const latency = new OperationLatencyTrackerService();
    const cache = { getCacheStats: () => ({ hits: 0, misses: 0, hitRate: 0 }) };
    const ctrl = new AdminOpsController(
      {} as never,
      {} as never,
      {} as never,
      metrics,
      cache as never,
      {} as never,
      latency,
    );
    const body = await ctrl.getMetrics();
    expect(body.latency).toMatchObject({
      byMetric: expect.any(Object),
      analyticsQueryDuration: expect.any(Object),
      analyticsTabsCompute: expect.objectContaining({ p50: expect.any(Number), p95: expect.any(Number) }),
      catalogConsistencyCompute: expect.objectContaining({ p50: expect.any(Number), p95: expect.any(Number) }),
    });
    expect(body.system).toMatchObject({
      uptime: expect.any(Number),
      uptimeSeconds: expect.any(Number),
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(body.counters).toBeDefined();
    expect(body.alerts).toEqual(expect.any(Array));
  });
});
