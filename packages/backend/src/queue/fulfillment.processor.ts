/**
 * Fulfillment Queue Processor — BullMQ worker для исполнения заказов.
 *
 * Jobs:
 * - yookassa-webhook: обработка webhook от YooKassa (PAID / FAILED)
 * - payment-paid: запуск fulfillment после подтверждения оплаты
 * - fulfillment-retry: retry PENDING items по cron
 * - auto-compensate: автоматический рефанд escalated items
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { FulfillmentService } from '../checkout/fulfillment.service';
import { PaymentService } from '../checkout/payment.service';
import { RefundService } from '../checkout/refund.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_FULFILLMENT } from './queue.constants';

@Injectable()
@Processor(QUEUE_FULFILLMENT)
export class FulfillmentProcessor extends WorkerHost {
  private readonly logger = new Logger(FulfillmentProcessor.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly fulfillmentService: FulfillmentService,
    private readonly refundService: RefundService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    const jobContext = job.data
      ? JSON.stringify(
          Object.fromEntries(
            Object.entries(job.data as Record<string, unknown>).filter(([k]) =>
              ['paymentIntentId', 'providerEventId', 'checkoutSessionId'].includes(k),
            ),
          ),
        )
      : '{}';
    this.logger.log(`[job=${job.name}] [jobId=${job.id}] ${jobContext} Processing fulfillment job`);

    switch (job.name) {
      case 'yookassa-webhook':
        return this.handleYookassaWebhook(job);

      case 'payment-paid':
        return this.handlePaymentPaid(job);

      case 'fulfillment-retry':
        return this.handleFulfillmentRetry();

      case 'auto-compensate':
        return this.handleAutoCompensate();

      default:
        this.logger.warn(`Unknown fulfillment job: ${job.name}`);
        return { status: 'unknown_job' };
    }
  }

  /**
   * Handle YooKassa webhook event.
   */
  private async handleYookassaWebhook(job: Job): Promise<unknown> {
    const { providerEventId, eventType, paymentObject } = job.data as {
      providerEventId: string;
      eventType: string;
      paymentObject: Record<string, unknown>;
    };

    this.logger.log(
      `[job=yookassa-webhook] [providerEventId=${providerEventId}] [eventType=${eventType}] Processing YooKassa webhook`,
    );

    // Find PaymentIntent by providerPaymentId
    const intent = await this.prisma.paymentIntent.findFirst({
      where: { providerPaymentId: providerEventId },
    });

    if (!intent) {
      // Try finding by metadata.paymentIntentId
      const metadata = paymentObject.metadata as Record<string, string> | undefined;
      if (metadata?.paymentIntentId) {
        const intentByKey = await this.prisma.paymentIntent.findUnique({
          where: { idempotencyKey: metadata.paymentIntentId },
        });
        if (intentByKey) {
          return this.processPaymentEvent(intentByKey.id, eventType, providerEventId);
        }
      }
      this.logger.warn(`[providerEventId=${providerEventId}] No PaymentIntent found for providerPaymentId`);
      return { status: 'intent_not_found' };
    }

    return this.processPaymentEvent(intent.id, eventType, providerEventId);
  }

  /**
   * Process payment event (PAID / FAILED / CANCELED).
   */
  private async processPaymentEvent(intentId: string, eventType: string, providerPaymentId: string): Promise<unknown> {
    if (eventType === 'payment.succeeded') {
      await this.paymentService.markPaid(intentId, providerPaymentId);

      // Start fulfillment
      const intent = await this.prisma.paymentIntent.findUnique({
        where: { id: intentId },
        select: { checkoutSessionId: true },
      });
      if (intent) {
        await this.fulfillmentService.startFulfillment(intent.checkoutSessionId);
        await this.fulfillmentService.executeFulfillment(intent.checkoutSessionId);
      }

      return { status: 'paid', intentId };
    }

    if (eventType === 'payment.canceled' || eventType === 'payment.cancelled') {
      await this.paymentService.markFailed(intentId, 'Cancelled by provider');
      return { status: 'cancelled', intentId };
    }

    this.logger.warn(`Unhandled payment event type: ${eventType}`);
    return { status: 'ignored', eventType };
  }

  /**
   * Handle payment-paid: start fulfillment for the session.
   */
  private async handlePaymentPaid(job: Job): Promise<unknown> {
    const { paymentIntentId } = job.data as { paymentIntentId: string };

    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      select: { checkoutSessionId: true, status: true },
    });

    if (!intent || intent.status !== 'PAID') {
      this.logger.warn(`[intent=${paymentIntentId}] payment-paid job: intent not found or not PAID`);
      return { status: 'skipped' };
    }

    await this.fulfillmentService.startFulfillment(intent.checkoutSessionId);
    await this.fulfillmentService.executeFulfillment(intent.checkoutSessionId);

    return { status: 'fulfilled', checkoutSessionId: intent.checkoutSessionId };
  }

  /**
   * Retry pending fulfillment items.
   */
  private async handleFulfillmentRetry(): Promise<unknown> {
    const count = await this.fulfillmentService.retryPendingItems();
    return { status: 'retried', count };
  }

  /**
   * Auto-compensate escalated items after 15-min window.
   */
  private async handleAutoCompensate(): Promise<unknown> {
    const count = await this.refundService.autoCompensate();
    return { status: 'compensated', count };
  }
}
