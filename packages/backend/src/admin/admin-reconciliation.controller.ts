/**
 * Admin Reconciliation Controller — сверка PaymentIntent ↔ FulfillmentItems.
 *
 * Endpoints:
 *   GET  /admin/reconciliation/intents        — PaymentIntents за период
 *   GET  /admin/reconciliation/mismatches     — Расхождения (PAID но FAILED items)
 *   POST /admin/reconciliation/:id/retry      — Ручной retry fulfillment
 *   POST /admin/reconciliation/:id/refund     — Ручной refund
 *   GET  /admin/ops/metrics                   — Payment counters
 */

import { Controller, Get, Post, Param, Query, UseGuards, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { FulfillmentService } from '../checkout/fulfillment.service';
import { RefundService } from '../checkout/refund.service';
import { PaymentMetricsService } from '../checkout/payment-metrics.service';
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
  @ApiOperation({ summary: 'PaymentIntents за период с FulfillmentItems' })
  async getIntents(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    const where: Record<string, unknown> = {};

    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    if (status) {
      where.status = status;
    }

    const intents = await this.prisma.paymentIntent.findMany({
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
              },
              orderBy: { lineItemIndex: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { items: intents, total: intents.length };
  }

  @Get('reconciliation/mismatches')
  @ApiOperation({ summary: 'Расхождения: PAID интенты с FAILED позициями' })
  async getMismatches() {
    // Find sessions where payment is PAID but fulfillment has FAILED items
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
            id: true, lineItemIndex: true, offerId: true, provider: true,
            amount: true, lastError: true, escalatedAt: true, resolvedBy: true,
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

  @Post('reconciliation/:sessionId/retry')
  @ApiOperation({ summary: 'Ручной retry fulfillment для сессии' })
  async retryFulfillment(@Param('sessionId') sessionId: string) {
    this.logger.log(`Admin retry fulfillment: session ${sessionId}`);

    // Reset FAILED items back to PENDING for retry
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
  async forceRefund(
    @Param('intentId') intentId: string,
    @Body() body: ReconciliationRefundDto,
  ) {
    this.logger.log(`Admin force refund: intent ${intentId}, partial=${body.partial}`);

    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
      select: { checkoutSessionId: true },
    });
    if (!intent) return { error: 'Intent not found' };

    if (body.partial) {
      await this.refundService.partialRefund(
        intent.checkoutSessionId,
        body.reason || 'Admin manual partial refund',
      );
    } else {
      await this.refundService.fullRefund(
        intentId,
        body.reason || 'Admin manual full refund',
      );
    }

    return { status: 'refunded', intentId };
  }

  @Post('reconciliation/:itemId/resolve')
  @ApiOperation({ summary: 'Пометить FAILED item как "решено админом" (prevents auto-refund)' })
  async resolveItem(
    @Param('itemId') itemId: string,
    @Body() body: ReconciliationResolveDto,
  ) {
    await this.prisma.fulfillmentItem.update({
      where: { id: itemId },
      data: {
        resolvedBy: 'admin', // TODO: use actual admin ID from JWT
        lastError: body.note ? `[RESOLVED] ${body.note}` : '[RESOLVED by admin]',
      },
    });

    return { status: 'resolved', itemId };
  }

  // ============================
  // Metrics / Ops
  // ============================

  @Get('ops/metrics')
  @ApiOperation({ summary: 'Payment metrics counters' })
  getMetrics() {
    return this.metrics.getMetrics();
  }
}
