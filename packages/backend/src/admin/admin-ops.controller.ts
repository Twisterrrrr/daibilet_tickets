import { Controller, Get, Post, UseGuards, UseInterceptors, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMetricsService } from '../checkout/payment-metrics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { QUEUE_SYNC, QUEUE_EMAILS } from '../queue/queue.constants';
import { TagAssignmentService } from '../scheduler/tag-assignment.service';

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
    private readonly tagAssignment: TagAssignmentService,
  ) {}

  /**
   * Operational health — pending stale, failed, escalated, active intents, sync jobs.
   */
  @Get('health')
  @Roles('ADMIN')
  async getHealth() {
    const now = new Date();

    const [
      pendingStale,
      failedUnresolved,
      escalatedOpen,
      activeIntents,
      syncCounts,
    ] = await Promise.all([
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
   * Payment metrics — rates (fulfillment_fail, webhook_dedup, auto_compensate) и thresholds.
   */
  @Get('metrics')
  @Roles('ADMIN')
  async getMetrics() {
    const m = this.metrics.getMetrics();
    const fulfillmentTotal = m.fulfillment_reserve_success + m.fulfillment_reserve_fail
      + m.fulfillment_confirm_success + m.fulfillment_confirm_fail;
    const fulfillmentFailRate = fulfillmentTotal > 0
      ? (m.fulfillment_reserve_fail + m.fulfillment_confirm_fail) / fulfillmentTotal
      : 0;
    const webhookDedupRate = m.webhook_received > 0 ? m.webhook_duplicate / m.webhook_received : 0;

    return {
      ...m,
      rates: {
        fulfillment_fail_rate: Math.round(fulfillmentFailRate * 10000) / 10000,
        webhook_dedup_rate: Math.round(webhookDedupRate * 10000) / 10000,
        auto_compensate_count: m.auto_compensate_triggered,
      },
      thresholds: {
        fulfillment_fail_rate_max: 0.1,
        webhook_dedup_rate_max: 0.5,
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
