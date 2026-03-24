import { describe, expect, it, vi } from 'vitest';

import {
  ADMIN_ANALYTICS_TABS_COMPUTE_METRIC,
  ADMIN_CATALOG_CONSISTENCY_COMPUTE_METRIC,
  OperationLatencyTrackerService,
} from '../operation-latency-tracker.service';

describe('OperationLatencyTrackerService', () => {
  it('computes p95 over >100 samples', () => {
    const t = new OperationLatencyTrackerService();
    for (let i = 1; i <= 150; i++) {
      t.record(ADMIN_ANALYTICS_TABS_COMPUTE_METRIC, i);
    }
    const s = t.getSnapshot(ADMIN_ANALYTICS_TABS_COMPUTE_METRIC);
    expect(s.count).toBe(150);
    expect(s.sampleCount).toBe(150);
    expect(s.p50).toBe(75);
    expect(s.p95).toBe(143);
    expect(s.p50Ms).toBe(75);
    expect(s.p95Ms).toBe(143);
    expect(s.lastUpdatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns -1 p50/p95 for unknown metric', () => {
    const t = new OperationLatencyTrackerService();
    const s = t.getSnapshot('nope');
    expect(s.count).toBe(0);
    expect(s.p50).toBe(-1);
    expect(s.p95).toBe(-1);
    expect(s.lastUpdatedAt).toBe('');
  });

  it('getAllSnapshots returns all recorded metric keys', () => {
    const t = new OperationLatencyTrackerService();
    t.record(ADMIN_ANALYTICS_TABS_COMPUTE_METRIC, 10);
    t.record(ADMIN_CATALOG_CONSISTENCY_COMPUTE_METRIC, 20);
    const all = t.getAllSnapshots();
    expect(Object.keys(all).sort()).toEqual(
      [ADMIN_ANALYTICS_TABS_COMPUTE_METRIC, ADMIN_CATALOG_CONSISTENCY_COMPUTE_METRIC].sort(),
    );
    expect(all[ADMIN_CATALOG_CONSISTENCY_COMPUTE_METRIC]?.p95).toBe(20);
  });

  it('track records latency around async work', async () => {
    const t = new OperationLatencyTrackerService();
    const fn = vi.fn().mockResolvedValue(42);
    const r = await t.track(ADMIN_ANALYTICS_TABS_COMPUTE_METRIC, fn);
    expect(r).toBe(42);
    const s = t.getSnapshot(ADMIN_ANALYTICS_TABS_COMPUTE_METRIC);
    expect(s.count).toBe(1);
    expect(s.p50).toBeGreaterThanOrEqual(0);
  });

  it('lastUpdatedAt advances when new samples are recorded', () => {
    vi.useFakeTimers();
    const t = new OperationLatencyTrackerService();
    vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
    t.record('m.x', 5);
    const a = t.getSnapshot('m.x').lastUpdatedAt;
    vi.setSystemTime(new Date('2024-06-02T12:00:00.000Z'));
    t.record('m.x', 10);
    const b = t.getSnapshot('m.x').lastUpdatedAt;
    expect(a).not.toBe(b);
    expect(b.startsWith('2024-06-02')).toBe(true);
    vi.useRealTimers();
  });
});
