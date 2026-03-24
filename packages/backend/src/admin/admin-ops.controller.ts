import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Get, Logger, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CacheService } from '../cache/cache.service';
import { PaymentMetricsService } from '../checkout/payment-metrics.service';
import {
  ADMIN_ANALYTICS_TABS_COMPUTE_METRIC,
  ADMIN_CATALOG_CONSISTENCY_COMPUTE_METRIC,
  ANALYTICS_QUERY_DURATION_PREFIX,
  OperationLatencyTrackerService,
} from '../common/operation-latency-tracker.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_EMAILS, QUEUE_SYNC } from '../queue/queue.constants';
import { TagAssignmentService } from '../scheduler/tag-assignment.service';
import { AuditInterceptor } from './audit.interceptor';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/ops')
export class AdminOpsController {
  private readonly logger = new Logger(AdminOpsController.name);

  constructor(
    @InjectQueue(QUEUE_SYNC) private readonly syncQueue: Queue,
    @InjectQueue(QUEUE_EMAILS) private readonly emailQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly metrics: PaymentMetricsService,
    private readonly cache: CacheService,
    private readonly tagAssignment: TagAssignmentService,
    private readonly latency: OperationLatencyTrackerService,
  ) {}

  /**
   * Operational health — pending stale, failed, escalated, active intents, sync jobs.
   */
  @Get('health')
  @Roles('ADMIN')
  async getHealth() {
    const now = new Date();

    const [pendingStale, failedUnresolved, escalatedOpen, activeIntents, syncCounts] = await Promise.all([
      this.prisma.orderRequest.count({
        where: {
          status: 'PENDING',
          expiresAt: { lt: now },
        },
      }),
      this.prisma.fulfillmentItem.count({
        where: { status: 'FAILED' },
      }),
      this.prisma.fulfillmentItem.count({
        where: { escalatedAt: { not: null }, status: { not: 'CONFIRMED' } },
      }),
      this.prisma.paymentIntent.count({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
      }),
      this.syncQueue.getJobCounts(),
    ]);

    return {
      pendingStale,
      failedUnresolved,
      escalatedOpen,
      activeIntents,
      activeSyncJobs: syncCounts.active + syncCounts.waiting,
      syncCounts,
    };
  }

  /**
   * Payment metrics — счётчики, доли ошибок, алерты, latency (скользящее окно), cache stats, system/uptime.
   * Контракт расширяемый: сохраняются плоские поля счётчиков (`...m`), `rates`, `thresholds`.
   */
  @Get('metrics')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Ops: payment counters, rates, alerts, cache, latency, system' })
  async getMetrics() {
    const m = this.metrics.getMetrics();
    const fulfillmentTotal =
      m.fulfillment_reserve_success +
      m.fulfillment_reserve_fail +
      m.fulfillment_confirm_success +
      m.fulfillment_confirm_fail;
    const fulfillmentFailRate =
      fulfillmentTotal > 0 ? (m.fulfillment_reserve_fail + m.fulfillment_confirm_fail) / fulfillmentTotal : 0;
    const webhookDedupRate = m.webhook_received > 0 ? m.webhook_duplicate / m.webhook_received : 0;

    const reserveTotal = m.fulfillment_reserve_success + m.fulfillment_reserve_fail;
    const fulfillmentReserveFailRatePct =
      reserveTotal > 0 ? +((m.fulfillment_reserve_fail / reserveTotal) * 100).toFixed(2) : 0;
    const autoCompensateRatePct =
      m.payment_intent_paid > 0 ? +((m.auto_compensate_triggered / m.payment_intent_paid) * 100).toFixed(2) : 0;
    const webhookDedupRatePct =
      m.webhook_received > 0 ? +((m.webhook_duplicate / m.webhook_received) * 100).toFixed(2) : 0;

    const alerts: { metric: string; level: 'ok' | 'warn' | 'critical'; value: number }[] = [];
    const addAlert = (metric: string, rate: number, warnThreshold: number, critThreshold: number) => {
      let level: 'ok' | 'warn' | 'critical' = 'ok';
      if (rate >= critThreshold) level = 'critical';
      else if (rate >= warnThreshold) level = 'warn';
      alerts.push({ metric, level, value: rate });
    };
    addAlert('fulfillment_fail_rate', fulfillmentReserveFailRatePct, 5, 15);
    addAlert('auto_compensate_rate', autoCompensateRatePct, 5, 15);
    addAlert('webhook_dedup_rate', webhookDedupRatePct, 10, 30);

    const cacheStats = this.cache.getCacheStats();

    const byMetric = this.latency.getAllSnapshots();
    const analyticsQueryDuration: Record<string, (typeof byMetric)[string]> = {};
    for (const [k, v] of Object.entries(byMetric)) {
      if (k.startsWith(ANALYTICS_QUERY_DURATION_PREFIX)) {
        analyticsQueryDuration[k] = v;
      }
    }

    return {
      ...m,
      counters: m,
      cache: cacheStats,
      rates: {
        fulfillment_fail_rate: Math.round(fulfillmentFailRate * 10000) / 10000,
        webhook_dedup_rate: Math.round(webhookDedupRate * 10000) / 10000,
        auto_compensate_count: m.auto_compensate_triggered,
        fulfillmentFailRate: fulfillmentReserveFailRatePct,
        autoCompensateRate: autoCompensateRatePct,
        webhookDedupRate: webhookDedupRatePct,
      },
      alerts,
      thresholds: {
        fulfillment_fail_rate_max: 0.1,
        webhook_dedup_rate_max: 0.5,
      },
      diagnostics: {
        catalogConsistency: 'GET /admin/catalog/consistency',
        analyticsTabs: 'GET /admin/dashboard/analytics-tabs?sinceDays=7',
        opsDiagnostics: 'GET /admin/ops/diagnostics',
      },
      latency: {
        byMetric,
        analyticsQueryDuration,
        analyticsTabsCompute: this.latency.getSnapshot(ADMIN_ANALYTICS_TABS_COMPUTE_METRIC),
        catalogConsistencyCompute: this.latency.getSnapshot(ADMIN_CATALOG_CONSISTENCY_COMPUTE_METRIC),
      },
      system: {
        uptimeSeconds: m.uptime_seconds,
        uptime: m.uptime_seconds,
        startedAt: m.started_at,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Статус всех очередей BullMQ.
   */
  @Get('queues')
  @Roles('ADMIN')
  async getQueueStatus() {
    const [syncCounts, emailCounts] = await Promise.all([
      this.syncQueue.getJobCounts(),
      this.emailQueue.getJobCounts(),
    ]);

    return {
      sync: syncCounts,
      emails: emailCounts,
    };
  }

  /**
   * Подробная информация об очереди sync: последние завершённые и неудачные задачи.
   */
  @Get('queues/sync')
  @Roles('ADMIN')
  async getSyncQueueDetails() {
    const [counts, completed, failed, active] = await Promise.all([
      this.syncQueue.getJobCounts(),
      this.syncQueue.getCompleted(0, 10),
      this.syncQueue.getFailed(0, 10),
      this.syncQueue.getActive(0, 5),
    ]);

    return {
      counts,
      active: active.map((j) => ({
        id: j.id,
        name: j.name,
        attemptsMade: j.attemptsMade,
        processedOn: j.processedOn,
        timestamp: j.timestamp,
      })),
      completed: completed.map((j) => ({
        id: j.id,
        name: j.name,
        finishedOn: j.finishedOn,
        returnvalue: j.returnvalue,
      })),
      failed: failed.map((j) => ({
        id: j.id,
        name: j.name,
        failedReason: j.failedReason,
        attemptsMade: j.attemptsMade,
        finishedOn: j.finishedOn,
      })),
    };
  }

  /**
   * Ручной запуск пересчёта динамических тегов (best-value, last-minute, today-available).
   */
  @Post('dynamic-tags')
  @Roles('ADMIN')
  async runDynamicTags() {
    this.logger.log('Admin triggered dynamic tag assignment');
    const result = await this.tagAssignment.runManually();
    return {
      success: true,
      message: 'Динамические теги пересчитаны',
      ...result,
    };
  }
}
