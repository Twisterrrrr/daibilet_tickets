/**
 * Admin Reconciliation Controller — сверка PaymentIntent ↔ FulfillmentItems.
 *
 * Endpoints:
 *   GET  /admin/reconciliation/intents        — PaymentIntents за период (cursor pagination)
 *   GET  /admin/reconciliation/mismatches     — Расхождения (PAID но FAILED items)
 *   GET  /admin/reconciliation/webhooks       — ProcessedWebhookEvent за период
 *   POST /admin/reconciliation/:id/retry      — Ручной retry fulfillment
 *   POST /admin/reconciliation/:id/refund     — Ручной refund
 *   POST /admin/reconciliation/:id/resolve    — Пометить как решённое
 *   GET  /admin/ops/metrics                   — Payment counters + alert rates
 *   GET  /admin/ops/health                    — Operational health dashboard
 */

import { Body, Controller, Get, Logger, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';

import type { AdminAuthUser } from '../auth/auth.types';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { FulfillmentService } from '../checkout/fulfillment.service';
import { PaymentMetricsService } from '../checkout/payment-metrics.service';
import { RefundService } from '../checkout/refund.service';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { ReconciliationRefundDto, ReconciliationResolveDto } from './dto/admin.dto';

@ApiTags('admin/reconciliation')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin')
export class AdminReconciliationController {
  private readonly logger = new Logger(AdminReconciliationController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fulfillmentService: FulfillmentService,
    private readonly refundService: RefundService,
    private readonly metrics: PaymentMetricsService,
  ) {}

  // ============================
  // Reconciliation
  // ============================

  @Get('reconciliation/intents')
  @ApiOperation({ summary: 'PaymentIntents за период с FulfillmentItems (cursor pagination)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'providerPaymentId', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getIntents(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('providerPaymentId') providerPaymentId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('provider') provider?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pagination = parsePagination({ cursor, page, limit });

    const where: Record<string, unknown> = {};

    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }
    if (status) where.status = status;
    if (providerPaymentId) where.providerPaymentId = providerPaymentId;
    if (supplierId) where.supplierId = supplierId;
    if (provider) where.provider = provider;

    const [rawItems, total] = await Promise.all([
      this.prisma.paymentIntent.findMany({
        where,
        include: {
          checkoutSession: {
            select: {
              id: true,
              shortCode: true,
              status: true,
              customerEmail: true,
              customerName: true,
              totalPrice: true,
              fulfillmentItems: {
                select: {
                  id: true,
                  lineItemIndex: true,
                  offerId: true,
                  purchaseFlow: true,
                  provider: true,
                  status: true,
                  externalOrderId: true,
                  amount: true,
                  refundedAmount: true,
                  attemptCount: true,
                  lastError: true,
                  escalatedAt: true,
                  resolvedBy: true,
                  nextRetryAt: true,
                },
                orderBy: { lineItemIndex: 'asc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(pagination),
      }),
      this.prisma.paymentIntent.count({ where }),
    ]);

    return buildPaginatedResult(rawItems as ((typeof rawItems)[number] & { id: string })[], total, pagination.limit);
  }

  @Get('reconciliation/mismatches')
  @ApiOperation({ summary: 'Расхождения: PAID интенты с FAILED позициями' })
  async getMismatches() {
    const mismatches = await this.prisma.checkoutSession.findMany({
      where: {
        paymentIntents: {
          some: { status: 'PAID' },
        },
        fulfillmentItems: {
          some: { status: 'FAILED' },
        },
      },
      include: {
        paymentIntents: {
          where: { status: 'PAID' },
          select: { id: true, amount: true, providerPaymentId: true, provider: true },
        },
        fulfillmentItems: {
          where: { status: 'FAILED' },
          select: {
            id: true,
            lineItemIndex: true,
            offerId: true,
            provider: true,
            amount: true,
            lastError: true,
            escalatedAt: true,
            resolvedBy: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return {
      items: mismatches.map((s) => ({
        sessionId: s.id,
        shortCode: s.shortCode,
        status: s.status,
        customerEmail: s.customerEmail,
        paidAmount: s.paymentIntents.reduce((sum, pi) => sum + pi.amount, 0),
        failedAmount: s.fulfillmentItems.reduce((sum, fi) => sum + fi.amount, 0),
        failedItems: s.fulfillmentItems,
        paymentIntents: s.paymentIntents,
      })),
      total: mismatches.length,
    };
  }

  @Get('reconciliation/webhooks')
  @ApiOperation({ summary: 'ProcessedWebhookEvent за период с дедупликация-статистикой' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'result', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getWebhooks(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('provider') provider?: string,
    @Query('eventType') eventType?: string,
    @Query('result') result?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pagination = parsePagination({ cursor, page, limit });

    const where: Record<string, unknown> = {};
    if (from || to) {
      where.processedAt = {};
      if (from) (where.processedAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.processedAt as Record<string, unknown>).lte = new Date(to);
    }
    if (provider) where.provider = provider;
    if (eventType) where.eventType = eventType;
    if (result) where.result = result;

    const [rawItems, total] = await Promise.all([
      this.prisma.processedWebhookEvent.findMany({
        where,
        orderBy: { processedAt: 'desc' },
        ...paginationArgs(pagination),
      }),
      this.prisma.processedWebhookEvent.count({ where }),
    ]);

    // Dedup statistics for the period
    const dedupStats = this.metrics.getMetrics();
    const webhookDeduplicates = dedupStats.webhook_duplicate;
    const webhookTotal = dedupStats.webhook_received;

    return {
      ...buildPaginatedResult(rawItems as ((typeof rawItems)[number] & { id: string })[], total, pagination.limit),
      dedupStats: {
        totalReceived: webhookTotal,
        duplicatesSkipped: webhookDeduplicates,
        dedupRate: webhookTotal > 0 ? +((webhookDeduplicates / webhookTotal) * 100).toFixed(2) : 0,
      },
    };
  }

  @Post('reconciliation/:sessionId/retry')
  @ApiOperation({ summary: 'Ручной retry fulfillment для сессии' })
  async retryFulfillment(@Param('sessionId') sessionId: string) {
    this.logger.log(`Admin retry fulfillment: session ${sessionId}`);

    await this.prisma.fulfillmentItem.updateMany({
      where: { checkoutSessionId: sessionId, status: 'FAILED' },
      data: {
        status: 'PENDING',
        attemptCount: 0,
        lastError: null,
        nextRetryAt: null,
        escalatedAt: null,
      },
    });

    await this.fulfillmentService.executeFulfillment(sessionId);

    return { status: 'retry_started', sessionId };
  }

  @Post('reconciliation/:intentId/refund')
  @ApiOperation({ summary: 'Ручной refund для PaymentIntent' })
  async forceRefund(@Param('intentId') intentId: string, @Body() body: ReconciliationRefundDto) {
    this.logger.log(`Admin force refund: intent ${intentId}, partial=${body.partial}`);

    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
      select: { checkoutSessionId: true },
    });
    if (!intent) return { error: 'Intent not found' };

    if (body.partial) {
      await this.refundService.partialRefund(intent.checkoutSessionId, body.reason || 'Admin manual partial refund');
    } else {
      await this.refundService.fullRefund(intentId, body.reason || 'Admin manual full refund');
    }

    return { status: 'refunded', intentId };
  }

  @Post('reconciliation/:itemId/resolve')
  @ApiOperation({ summary: 'Пометить FAILED item как "решено админом" (prevents auto-refund)' })
  async resolveItem(
    @Param('itemId') itemId: string,
    @Body() body: ReconciliationResolveDto,
    @Req() req: ExpressRequest & { user: AdminAuthUser },
  ) {
    await this.prisma.fulfillmentItem.update({
      where: { id: itemId },
      data: {
        resolvedBy: req.user.id,
        lastError: body.note ? `[RESOLVED] ${body.note}` : '[RESOLVED by admin]',
      },
    });

    return { status: 'resolved', itemId };
  }

  // ============================
  // Metrics / Ops
  // ============================

  @Get('ops/metrics')
  @ApiOperation({ summary: 'Payment metrics counters + alert rates' })
  getMetrics() {
    const raw = this.metrics.getMetrics();

    // Calculate alert rates
    const reserveTotal = raw.fulfillment_reserve_success + raw.fulfillment_reserve_fail;
    const fulfillmentFailRate =
      reserveTotal > 0 ? +((raw.fulfillment_reserve_fail / reserveTotal) * 100).toFixed(2) : 0;

    const autoCompensateRate =
      raw.payment_intent_paid > 0 ? +((raw.auto_compensate_triggered / raw.payment_intent_paid) * 100).toFixed(2) : 0;

    const webhookDedupRate =
      raw.webhook_received > 0 ? +((raw.webhook_duplicate / raw.webhook_received) * 100).toFixed(2) : 0;

    // Threshold alerts
    const alerts: { metric: string; level: 'ok' | 'warn' | 'critical'; value: number }[] = [];

    const addAlert = (metric: string, rate: number, warnThreshold: number, critThreshold: number) => {
      let level: 'ok' | 'warn' | 'critical' = 'ok';
      if (rate >= critThreshold) level = 'critical';
      else if (rate >= warnThreshold) level = 'warn';
      alerts.push({ metric, level, value: rate });
    };

    addAlert('fulfillment_fail_rate', fulfillmentFailRate, 5, 15);
    addAlert('auto_compensate_rate', autoCompensateRate, 5, 15);
    addAlert('webhook_dedup_rate', webhookDedupRate, 10, 30);

    return {
      counters: raw,
      rates: {
        fulfillmentFailRate,
        autoCompensateRate,
        webhookDedupRate,
      },
      alerts,
    };
  }

  @Get('ops/health')
  @ApiOperation({ summary: 'Operational health: pending, failed, escalated items' })
  async getHealth() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [pendingStale, failedUnresolved, escalatedOpen, totalActiveIntents] = await Promise.all([
      // PENDING items older than 1 hour
      this.prisma.fulfillmentItem.count({
        where: {
          status: { in: ['PENDING', 'RESERVING'] },
          updatedAt: { lte: oneHourAgo },
        },
      }),
      // FAILED items without admin resolution
      this.prisma.fulfillmentItem.count({
        where: {
          status: 'FAILED',
          resolvedBy: null,
          refundedAmount: 0,
        },
      }),
      // Escalated items (FAILED with escalatedAt)
      this.prisma.fulfillmentItem.count({
        where: {
          status: 'FAILED',
          escalatedAt: { not: null },
          resolvedBy: null,
        },
      }),
      // Active (non-terminal) PaymentIntents
      this.prisma.paymentIntent.count({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      }),
    ]);

    const status: 'healthy' | 'degraded' | 'critical' =
      failedUnresolved > 10 || pendingStale > 5
        ? 'critical'
        : failedUnresolved > 3 || pendingStale > 2 || escalatedOpen > 0
          ? 'degraded'
          : 'healthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      counts: {
        pendingStale,
        failedUnresolved,
        escalatedOpen,
        totalActiveIntents,
      },
      thresholds: {
        pendingStale: { warn: 2, critical: 5, unit: 'items older than 1h' },
        failedUnresolved: { warn: 3, critical: 10, unit: 'items' },
      },
    };
  }
}
