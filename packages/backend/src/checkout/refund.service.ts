/**
 * Refund Service — возвраты через YooKassa.
 *
 * Поддерживает:
 * - Полный refund (все позиции не удались)
 * - Частичный refund (часть позиций FAILED)
 * - Ручной refund через админку
 *
 * Компенсационная логика:
 *   FAILED items + 15 мин без вмешательства админа → авто-refund.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { MailService } from '../mail/mail.service';
import { tryTransitionPayment } from './checkout-state-machine';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Полный рефанд PaymentIntent.
   */
  async fullRefund(intentId: string, reason: string): Promise<void> {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
      include: { checkoutSession: { select: { customerEmail: true, customerName: true, shortCode: true } } },
    });
    if (!intent) throw new Error(`PaymentIntent ${intentId} not found`);

    // State machine: PAID → REFUNDED
    const transition = tryTransitionPayment(intent.status, 'REFUNDED', 'system');
    if (!transition.allowed) {
      this.logger.warn(`Cannot refund intent ${intentId}: ${transition.reason}`);
      return;
    }
    if (transition.noOp) return;

    // Call YooKassa refund if real provider
    let refundId: string | null = null;
    if (intent.provider === 'YOOKASSA' && intent.providerPaymentId) {
      const ykResult = await this.paymentService.createYookassaRefund({
        providerPaymentId: intent.providerPaymentId,
        amount: intent.amount,
        description: reason,
      });
      refundId = ykResult.refundId;
    }

    // Update intent status
    await this.prisma.paymentIntent.update({
      where: { id: intentId },
      data: {
        status: 'REFUNDED',
        failReason: `REFUND: ${reason}`,
      },
    });

    // Update all fulfillment items to REFUNDED
    await this.prisma.fulfillmentItem.updateMany({
      where: { checkoutSessionId: intent.checkoutSessionId },
      data: {
        status: 'REFUNDED',
        refundedAmount: intent.amount,
        refundId,
      },
    });

    this.logger.log(`Full refund for intent ${intentId}: amount=${intent.amount}, reason=${reason}`);

    // Email notification
    if (intent.checkoutSession.customerEmail) {
      this.mailService.sendOrderRejected(intent.checkoutSession.customerEmail, {
        customerName: intent.checkoutSession.customerName || 'Клиент',
        shortCode: intent.checkoutSession.shortCode,
        reason: `Возврат средств: ${reason}`,
      }).catch((e: Error) => this.logger.error(`Refund email failed: ${e.message}`));
    }
  }

  /**
   * Частичный рефанд: только за FAILED позиции.
   */
  async partialRefund(checkoutSessionId: string, reason: string): Promise<void> {
    const failedItems = await this.prisma.fulfillmentItem.findMany({
      where: { checkoutSessionId, status: 'FAILED' },
    });

    if (failedItems.length === 0) {
      this.logger.debug(`No failed items for partial refund: session ${checkoutSessionId}`);
      return;
    }

    const refundAmount = failedItems.reduce((sum, item) => sum + item.amount, 0);
    if (refundAmount <= 0) return;

    // Find the PAID PaymentIntent
    const intent = await this.prisma.paymentIntent.findFirst({
      where: { checkoutSessionId, status: 'PAID' },
      include: { checkoutSession: { select: { customerEmail: true, customerName: true, shortCode: true } } },
    });

    if (!intent) {
      this.logger.warn(`No PAID intent for partial refund: session ${checkoutSessionId}`);
      return;
    }

    // If refund covers entire amount → full refund
    if (refundAmount >= intent.amount) {
      return this.fullRefund(intent.id, reason);
    }

    // YooKassa partial refund
    let refundId: string | null = null;
    if (intent.provider === 'YOOKASSA' && intent.providerPaymentId) {
      const ykResult = await this.paymentService.createYookassaRefund({
        providerPaymentId: intent.providerPaymentId,
        amount: refundAmount,
        description: `Частичный возврат: ${reason}`,
      });
      refundId = ykResult.refundId;
    }

    // Mark failed items as REFUNDED
    for (const item of failedItems) {
      await this.prisma.fulfillmentItem.update({
        where: { id: item.id },
        data: {
          status: 'REFUNDED',
          refundedAmount: item.amount,
          refundId,
        },
      });
    }

    this.logger.log(
      `Partial refund for session ${checkoutSessionId}: ` +
      `${failedItems.length} items, amount=${refundAmount}, intent=${intent.id}`,
    );

    // Email notification
    if (intent.checkoutSession.customerEmail) {
      this.mailService.sendOrderRejected(intent.checkoutSession.customerEmail, {
        customerName: intent.checkoutSession.customerName || 'Клиент',
        shortCode: intent.checkoutSession.shortCode,
        reason: `Частичный возврат (${failedItems.length} поз.): ${reason}`,
      }).catch((e: Error) => this.logger.error(`Partial refund email failed: ${e.message}`));
    }
  }

  /**
   * Auto-compensation: проверить FAILED items с истёкшим 15-мин окном.
   * Вызывается cron-ом каждую минуту.
   */
  async autoCompensate(): Promise<number> {
    const ADMIN_WINDOW_MINUTES = 15;
    const cutoff = new Date(Date.now() - ADMIN_WINDOW_MINUTES * 60 * 1000);

    // Find escalated items where admin didn't intervene within window
    const escalatedItems = await this.prisma.fulfillmentItem.findMany({
      where: {
        status: 'FAILED',
        escalatedAt: { lte: cutoff },
        resolvedBy: null, // Admin hasn't acted
        refundedAmount: 0,
      },
      select: { id: true, checkoutSessionId: true },
    });

    if (escalatedItems.length === 0) return 0;

    // Group by session
    const sessionIds = [...new Set(escalatedItems.map((i) => i.checkoutSessionId))];

    for (const sessionId of sessionIds) {
      try {
        await this.partialRefund(sessionId, 'Автоматический возврат: не удалось зарезервировать');
      } catch (error) {
        this.logger.error(`Auto-compensate failed for session ${sessionId}: ${(error as Error).message}`);
      }
    }

    this.logger.log(`Auto-compensation: processed ${sessionIds.length} sessions, ${escalatedItems.length} items`);
    return escalatedItems.length;
  }
}
