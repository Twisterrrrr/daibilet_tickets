import { createHash } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';

import { CACHE_TTL, CacheService } from '../cache/cache.service';

import {

  ADMIN_ANALYTICS_TABS_COMPUTE_METRIC,

  OperationLatencyTrackerService,

} from '../common/operation-latency-tracker.service';

import { PrismaService } from '../prisma/prisma.service';

import { AnalyticsService } from './analytics.service';
import { buildDashboardSummary } from './admin-dashboard-summary.util';
import type { DashboardSummaryResponse } from './dashboard-summary.types';
import { SeoAuditService } from './seo-audit/seo-audit.service';



/** Разрешённые окна для operations (AN-1 hardening). */

export const ANALYTICS_TABS_ALLOWED_SINCE_DAYS = [7, 14, 30] as const;



/** Экспорт для unit-тестов политики sinceDays. */
export function normalizeSinceDays(raw: number): number {

  if (!Number.isFinite(raw)) return 7;

  const rounded = Math.round(raw);

  if ((ANALYTICS_TABS_ALLOWED_SINCE_DAYS as readonly number[]).includes(rounded)) return rounded;

  return 7;

}



function analyticsTabsCacheTtlSec(): number {

  return CACHE_TTL.ANALYTICS_TABS;

}



/** Версия фильтров для ключа Redis; при новых query-фильтрах расширить объект и bump v. */

const ANALYTICS_TABS_FILTERS_FINGERPRINT = { v: 1 as const };



export function analyticsTabsFiltersFingerprint(): string {

  return createHash('sha256')

    .update(JSON.stringify(ANALYTICS_TABS_FILTERS_FINGERPRINT))

    .digest('hex')

    .slice(0, 16);

}



function analyticsCacheKey(sinceDays: number): string {

  return `analytics:${sinceDays}:${analyticsTabsFiltersFingerprint()}`;

}



function structuredAdminLog(parts: {

  level: 'log' | 'warn' | 'error';

  type: string;

  message: string;

  requestId: string;

  meta?: Record<string, unknown>;

}) {

  return JSON.stringify({

    level: parts.level,

    type: parts.type,

    message: parts.message,

    requestId: parts.requestId,

    ...(parts.meta ? { meta: parts.meta } : {}),

  });

}



/**

 * Тяжёлые агрегаты дашборда (AN-1): кэш Redis, параметр sinceDays, логирование медленного пересчёта.

 */

@Injectable()

export class AdminDashboardService {

  private readonly logger = new Logger(AdminDashboardService.name);



  constructor(

    private readonly prisma: PrismaService,

    private readonly cache: CacheService,

    private readonly latency: OperationLatencyTrackerService,

    private readonly analytics: AnalyticsService,

    private readonly seoAudit: SeoAuditService,

  ) {}



  async getAnalyticsTabs(sinceDaysRaw: number, opts?: { bypassCache?: boolean; requestId?: string }) {

    const sinceDays = normalizeSinceDays(sinceDaysRaw);

    const key = analyticsCacheKey(sinceDays);

    const ttl = analyticsTabsCacheTtlSec();

    const rolling = () => this.latency.getSnapshot(ADMIN_ANALYTICS_TABS_COMPUTE_METRIC);

    const requestId = opts?.requestId ?? '';



    const bypass =

      opts?.bypassCache === true ||

      process.env.ANALYTICS_TABS_CACHE_BYPASS === '1' ||

      process.env.ANALYTICS_TABS_DEBUG === '1';



    if (!bypass) {

      const cached = await this.cache.get<
        Awaited<ReturnType<AnalyticsService['computeAnalyticsTabs']>>['tabs']
      >(key);

      if (cached !== null) {

        this.logger.log(structuredAdminLog({ level: 'log', type: 'ANALYTICS_TABS_CACHE', message: 'hit', requestId, meta: { sinceDays, key } }));

        return {

          ...cached,

          meta: {

            sinceDays,

            servedFromCache: true,

            marketingWindowDays: 30,

            rollingComputeMs: rolling(),

            cacheKey: key,

            cacheTtlSeconds: ttl,

            popularTopicsSource: 'cache' as const,

            preaggWindowComplete: false,

          },

        };

      }

      this.logger.log(structuredAdminLog({ level: 'log', type: 'ANALYTICS_TABS_CACHE', message: 'miss', requestId, meta: { sinceDays, key } }));

    }



    const { computeMs, tabs, analyticsMeta } = await this.latency.track(
      ADMIN_ANALYTICS_TABS_COMPUTE_METRIC,
      async () => {
        const t0 = Date.now();

        const out = await this.analytics.computeAnalyticsTabs(sinceDays);

        return { computeMs: Date.now() - t0, tabs: out.tabs, analyticsMeta: out.analyticsMeta };

      },
    );



    if (computeMs > 300) {

      this.logger.warn(

        structuredAdminLog({

          level: 'warn',

          type: 'SLOW_ANALYTICS_QUERY',

          message: 'analytics-tabs compute exceeded threshold',

          requestId,

          meta: { duration: computeMs, sinceDays },

        }),

      );

    }

    if (computeMs > 2000) {

      const snap = rolling();

      this.logger.warn(

        `analytics-tabs slow compute ${computeMs}ms (sinceDays=${sinceDays}) p95=${snap.p95Ms ?? 'n/a'} n=${snap.count}`,

      );

    }



    if (!bypass) {

      await this.cache.set(key, tabs, ttl);

    }



    return {

      ...tabs,

      meta: {

        sinceDays,

        computeMs,

        servedFromCache: false,

        marketingWindowDays: 30,

        rollingComputeMs: rolling(),

        cacheKey: key,

        cacheTtlSeconds: ttl,

        cacheBypassed: bypass,

        popularTopicsSource: analyticsMeta.popularTopicsSource,

        preaggWindowComplete: analyticsMeta.preaggWindowComplete,

      },

    };

  }

  private static readonly DASHBOARD_SUMMARY_CACHE_KEY = 'dashboard:summary:v1';

  /**
   * Операционная сводка витрины (Health / Activity / Content / Operations + Attention).
   * Кэш Redis ~60–120 с (см. CACHE_TTL.DASHBOARD_SUMMARY).
   */
  async getDashboardSummary(opts?: { bypassCache?: boolean }): Promise<DashboardSummaryResponse> {
    const ttl = CACHE_TTL.DASHBOARD_SUMMARY;
    const bypass =
      opts?.bypassCache === true || process.env.DASHBOARD_CACHE_BYPASS === '1';
    if (!bypass) {
      const cached = await this.cache.get<DashboardSummaryResponse>(
        AdminDashboardService.DASHBOARD_SUMMARY_CACHE_KEY,
      );
      if (cached) {
        return {
          ...cached,
          meta: {
            ...cached.meta,
            servedFromCache: true,
          },
        };
      }
    }

    const body = await buildDashboardSummary({
      prisma: this.prisma,
      seoAudit: this.seoAudit,
    });
    if (!bypass) {
      await this.cache.set(AdminDashboardService.DASHBOARD_SUMMARY_CACHE_KEY, body, ttl);
    }
    return body;
  }

}

