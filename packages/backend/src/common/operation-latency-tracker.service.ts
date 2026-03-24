import { Injectable } from '@nestjs/common';



/**

 * Снимок по метрике: скользящее окно замеров (in-memory, сброс при рестарте).

 * Поля p50/p95/count/lastUpdatedAt — компактный контракт для ops; legacy-поля сохранены.

 */

export type LatencySnapshot = {

  metric: string;

  /** p50 в мс; -1 если замеров нет. */

  p50: number;

  /** p95 в мс; -1 если замеров нет. */

  p95: number;

  count: number;

  /** ISO время последнего record(); пустая строка, если не было замеров. */

  lastUpdatedAt: string;

  /** @deprecated используйте count */

  sampleCount: number;

  maxMs: number | null;

  /** @deprecated используйте p50 */

  p50Ms: number | null;

  /** @deprecated используйте p95 */

  p95Ms: number | null;

};



const DEFAULT_MAX_SAMPLES = 256;



function percentileNearestRankSorted(sortedAsc: number[], p: number): number | null {

  if (sortedAsc.length === 0) return null;

  const n = sortedAsc.length;

  const idx = Math.min(n - 1, Math.max(0, Math.ceil(p * n) - 1));

  return sortedAsc[idx] ?? null;

}



function toSnapshot(

  metric: string,

  sorted: number[] | null,

  lastMs: number | undefined,

): LatencySnapshot {

  const lastUpdatedAt = lastMs != null ? new Date(lastMs).toISOString() : '';

  if (!sorted || sorted.length === 0) {

    return {

      metric,

      p50: -1,

      p95: -1,

      count: 0,

      lastUpdatedAt,

      sampleCount: 0,

      maxMs: null,

      p50Ms: null,

      p95Ms: null,

    };

  }

  const maxMs = sorted[sorted.length - 1] ?? null;

  const n = sorted.length;

  const p50Ms = percentileNearestRankSorted(sorted, 0.5);

  const p95Ms = percentileNearestRankSorted(sorted, 0.95);

  return {

    metric,

    p50: p50Ms ?? -1,

    p95: p95Ms ?? -1,

    count: n,

    lastUpdatedAt,

    sampleCount: n,

    maxMs,

    p50Ms,

    p95Ms,

  };

}



export const ADMIN_ANALYTICS_TABS_COMPUTE_METRIC = 'admin.dashboard.analyticsTabs.compute';

/** Префикс ключей в getAllSnapshots(): `analytics.query.duration|<endpoint>|<query>`. p95 — по каждой паре. */
export const ANALYTICS_QUERY_DURATION_PREFIX = 'analytics.query.duration';

export const ADMIN_CATALOG_CONSISTENCY_COMPUTE_METRIC = 'admin.catalog.consistency.compute';



@Injectable()

export class OperationLatencyTrackerService {

  private readonly buffers = new Map<string, number[]>();

  private readonly lastRecordedAtMs = new Map<string, number>();

  private readonly maxSamples: number;



  constructor() {

    const raw = process.env.OPERATION_LATENCY_MAX_SAMPLES;

    const n = raw ? parseInt(raw, 10) : DEFAULT_MAX_SAMPLES;

    this.maxSamples = Number.isFinite(n) && n > 8 ? Math.min(4096, n) : DEFAULT_MAX_SAMPLES;

  }



  /**
   * Длительность подзапросов analytics-tabs: отдельное скользящее окно и p95 на пару (endpoint, query).
   */
  recordAnalyticsQueryDuration(durationMs: number, tags: { endpoint: string; query: string }) {
    const ep = tags.endpoint.replace(/\|/g, '_');
    const q = tags.query.replace(/\|/g, '_');
    this.record(`${ANALYTICS_QUERY_DURATION_PREFIX}|${ep}|${q}`, durationMs);
  }

  record(metric: string, durationMs: number) {

    if (!metric || !Number.isFinite(durationMs) || durationMs < 0) return;

    let buf = this.buffers.get(metric);

    if (!buf) {

      buf = [];

      this.buffers.set(metric, buf);

    }

    buf.push(durationMs);

    this.lastRecordedAtMs.set(metric, Date.now());

    const overflow = buf.length - this.maxSamples;

    if (overflow > 0) {

      buf.splice(0, overflow);

    }

  }



  /**

   * Выполнить async-work и записать длительность в метрику (успех/ошибка — длительность всё равно пишется).

   */

  async track<T>(metric: string, work: () => Promise<T>): Promise<T> {

    const t0 = Date.now();

    try {

      return await work();

    } finally {

      this.record(metric, Date.now() - t0);

    }

  }



  getSnapshot(metric: string): LatencySnapshot {

    const buf = this.buffers.get(metric);

    const lastMs = this.lastRecordedAtMs.get(metric);

    if (!buf || buf.length === 0) {

      return toSnapshot(metric, null, lastMs);

    }

    const sorted = [...buf].sort((a, b) => a - b);

    return toSnapshot(metric, sorted, lastMs);

  }



  /** Все накопленные метрики (для /admin/ops/metrics). */

  getAllSnapshots(): Record<string, LatencySnapshot> {

    const out: Record<string, LatencySnapshot> = {};

    for (const key of this.buffers.keys()) {

      out[key] = this.getSnapshot(key);

    }

    return out;

  }

}


