/**
 * Fulfillment Service — оркестратор исполнения заказа после оплаты.
 *
 * Поток:
 *   PaymentIntent PAID → создание FulfillmentItems → reserve → confirm
 *
 * Для каждой позиции в snapshot:
 *   - PLATFORM: reserve → confirm через BookingProvider
 *   - EXTERNAL: status tracking (оплата на стороне провайдера)
 *
 * Partial failure → escalation → auto-refund через 15 мин.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SnapshotLineItem, PaymentFlowType, isSessionFullyFulfilled } from './cart-partitioning';
import { BookingProvider, BookingProviderRegistry, BOOKING_PROVIDER_TOKEN } from './booking-provider.interface';
import { tryTransitionCheckout } from './checkout-state-machine';
import { MailService } from '../mail/mail.service';
import { QUEUE_EMAILS } from '../queue/queue.constants';

/** Max retry attempts per fulfillment item */
const MAX_RETRY_ATTEMPTS = 3;

/** Backoff delays in ms: 5s, 30s, 2min */
const RETRY_DELAYS = [5_000, 30_000, 120_000];

@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    @Inject(BOOKING_PROVIDER_TOKEN) private readonly providers: BookingProviderRegistry,
    @InjectQueue(QUEUE_EMAILS) private readonly emailQueue: Queue,
  ) {}

  /**
   * Начать исполнение заказа: создать FulfillmentItem для каждой позиции.
   * Вызывается после PaymentIntent.PAID.
   */
  async startFulfillment(checkoutSessionId: string): Promise<void> {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: checkoutSessionId },
      select: { id: true, offersSnapshot: true, giftCertificateSnapshot: true, status: true, shortCode: true },
    });

    if (!session) {
      this.logger.error(`startFulfillment: session ${checkoutSessionId} not found`);
      return;
    }

    // Подарочный сертификат: создать GiftCertificate и завершить сессию
    const giftCert = session.giftCertificateSnapshot as { amount: number; recipientEmail: string; senderName?: string; message?: string } | null;
    if (giftCert?.amount) {
      await this.fulfillGiftCertificate(checkoutSessionId, session, giftCert);
      return;
    }

    const snapshot = (session.offersSnapshot as SnapshotLineItem[] | null) || [];
    if (snapshot.length === 0) {
      this.logger.warn(`startFulfillment: empty snapshot for session ${checkoutSessionId}`);
      return;
    }

    // Check if fulfillment items already exist (idempotency)
    const existing = await this.prisma.fulfillmentItem.count({
      where: { checkoutSessionId },
    });
    if (existing > 0) {
      this.logger.debug(`Fulfillment items already exist for session ${checkoutSessionId}, skipping creation`);
      return;
    }

    // Determine provider for each item based on source
    const items = snapshot.map((item) => {
      let provider = 'INTERNAL';
      if (item.source === 'TC') provider = 'TC';
      else if (item.source === 'TEPLOHOD') provider = 'TEP';
      else if (item.source === 'MANUAL' && item.supplierId) provider = 'PARTNER';

      return {
        checkoutSessionId,
        lineItemIndex: item.lineItemIndex,
        offerId: item.offerId,
        purchaseFlow: item.purchaseFlow as 'PLATFORM' | 'EXTERNAL',
        provider,
        status: 'PENDING' as const,
        amount: item.lineTotal,
      };
    });

    await this.prisma.fulfillmentItem.createMany({
      data: items.map((i) => ({
        ...i,
        updatedAt: new Date(),
      })),
    });

    this.logger.log(
      `[session=${checkoutSessionId}] Created ${items.length} fulfillment items for ${session.shortCode}: ` +
      `${items.filter((i) => i.purchaseFlow === 'PLATFORM').length} PLATFORM, ` +
      `${items.filter((i) => i.purchaseFlow === 'EXTERNAL').length} EXTERNAL`,
    );
  }

  /**
   * Исполнение подарочного сертификата: создать запись и завершить сессию.
   */
  private async fulfillGiftCertificate(
    checkoutSessionId: string,
    session: { id: string; shortCode: string },
    giftCert: { amount: number; recipientEmail: string; senderName?: string; message?: string },
  ): Promise<void> {
    const existing = await this.prisma.giftCertificate.findUnique({
      where: { checkoutSessionId },
    });
    if (existing) {
      this.logger.debug(`GiftCertificate already exists for session ${checkoutSessionId}, skipping`);
      await this.transitionSessionToCompleted(checkoutSessionId);
      return;
    }

    const code = this.generateGiftCertificateCode();

    await this.prisma.$transaction(async (tx) => {
      await tx.giftCertificate.create({
        data: {
          checkoutSessionId,
          amount: giftCert.amount,
          code,
          recipientEmail: giftCert.recipientEmail,
          senderName: giftCert.senderName || null,
          message: giftCert.message || null,
          status: 'ISSUED',
        },
      });
      await tx.checkoutSession.update({
        where: { id: checkoutSessionId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });

    this.logger.log(
      `[session=${checkoutSessionId}] Gift certificate created: ${code}, recipient=${giftCert.recipientEmail}`,
    );

    // Отправка email через очередь (retry при сбое)
    const sent = await this.mailService.sendGiftCertificate(giftCert.recipientEmail, {
      code,
      amountKopecks: giftCert.amount,
      senderName: giftCert.senderName || null,
      message: giftCert.message || null,
    });
    if (!sent) {
      await this.emailQueue.add(
        'gift-certificate',
        {
          type: 'gift-certificate',
          to: giftCert.recipientEmail,
          code,
          amountKopecks: giftCert.amount,
          senderName: giftCert.senderName || null,
          message: giftCert.message || null,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );
      this.logger.warn(`[session=${checkoutSessionId}] Gift cert email queued for retry → ${giftCert.recipientEmail}`);
    }
  }

  private generateGiftCertificateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'GC-';
    for (let i = 0; i < 4; i++) result += chars[Math.floor(Math.random() * chars.length)];
    result += '-';
    for (let i = 0; i < 4; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  }

  private async transitionSessionToCompleted(checkoutSessionId: string): Promise<void> {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: checkoutSessionId },
      select: { status: true, appliedGiftCertificateSnapshot: true },
    });
    if (!session || session.status === 'COMPLETED') return;

    const { tryTransitionCheckout } = await import('./checkout-state-machine');
    const transition = tryTransitionCheckout(session.status, 'COMPLETED', 'system');
    if (transition.allowed && !transition.noOp) {
      await this.prisma.$transaction(async (tx) => {
        await tx.checkoutSession.update({
          where: { id: checkoutSessionId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        // Пометить применённый подарочный сертификат как использованный
        const applied = session.appliedGiftCertificateSnapshot as { certificateId: string } | null | undefined;
        if (applied?.certificateId) {
          await tx.giftCertificate.update({
            where: { id: applied.certificateId },
            data: { status: 'ACTIVATED', activatedAt: new Date() },
          });
          this.logger.log(`[session=${checkoutSessionId}] Gift certificate ${applied.certificateId} marked ACTIVATED`);
        }
      });
    }
  }

  /**
   * Исполнить все PLATFORM позиции: reserve → confirm.
   * Вызывается из BullMQ job.
   */
  async executeFulfillment(checkoutSessionId: string): Promise<void> {
    const items = await this.prisma.fulfillmentItem.findMany({
      where: {
        checkoutSessionId,
        purchaseFlow: 'PLATFORM',
        status: { in: ['PENDING', 'RESERVING'] },
      },
      orderBy: { lineItemIndex: 'asc' },
    });

    if (items.length === 0) {
      this.logger.debug(`No PLATFORM items to fulfill for session ${checkoutSessionId}`);
      await this.checkCompletion(checkoutSessionId);
      return;
    }

    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: checkoutSessionId },
      select: { offersSnapshot: true, customerEmail: true, customerName: true },
    });
    const snapshot = (session?.offersSnapshot as SnapshotLineItem[] | null) || [];

    for (const item of items) {
      const snapshotItem = snapshot[item.lineItemIndex];
      if (!snapshotItem) {
        this.logger.error(`Snapshot item not found at index ${item.lineItemIndex}`);
        await this.markItemFailed(item.id, 'SNAPSHOT_MISSING', 'Snapshot item not found');
        continue;
      }

      const provider = this.getProvider(item.provider);
      if (!provider) {
        this.logger.error(`Provider not found: ${item.provider}`);
        await this.markItemFailed(item.id, 'PROVIDER_NOT_FOUND', `Provider ${item.provider} not registered`);
        continue;
      }

      // Update status to RESERVING
      await this.prisma.fulfillmentItem.update({
        where: { id: item.id },
        data: { status: 'RESERVING' },
      });

      // Reserve
      const reserveResult = await provider.reserve({
        fulfillmentItemId: item.id,
        offerId: item.offerId,
        externalEventId: snapshotItem.source === 'TC' ? undefined : undefined, // TODO: pass externalEventId
        quantity: snapshotItem.quantity,
        amount: item.amount,
        customerEmail: session?.customerEmail || undefined,
        customerName: session?.customerName || undefined,
        idempotencyKey: `reserve_${item.id}`,
      });

      if (!reserveResult.success) {
        await this.handleItemFailure(item.id, reserveResult.errorCode || 'RESERVE_FAILED', reserveResult.errorMessage || 'Reserve failed', reserveResult.retryable !== false);
        continue;
      }

      // Update to RESERVED
      await this.prisma.fulfillmentItem.update({
        where: { id: item.id },
        data: {
          status: 'RESERVED',
          externalOrderId: reserveResult.externalOrderId,
          externalPaymentUrl: reserveResult.externalPaymentUrl,
          providerData: (reserveResult.providerData ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
        },
      });

      // Confirm
      const confirmResult = await provider.confirm({
        fulfillmentItemId: item.id,
        externalOrderId: reserveResult.externalOrderId || '',
        providerData: reserveResult.providerData,
      });

      if (!confirmResult.success) {
        await this.handleItemFailure(item.id, confirmResult.errorCode || 'CONFIRM_FAILED', confirmResult.errorMessage || 'Confirm failed', true);
        continue;
      }

      // Update to CONFIRMED
      await this.prisma.fulfillmentItem.update({
        where: { id: item.id },
        data: { status: 'CONFIRMED' },
      });

      this.logger.log(`[session=${checkoutSessionId}] [item=${item.id}] [provider=${item.provider}] Fulfillment item CONFIRMED`);
    }

    // Check if session is fully fulfilled
    await this.checkCompletion(checkoutSessionId);
  }

  /**
   * Handle item failure: retry or escalate.
   */
  async handleItemFailure(
    itemId: string,
    errorCode: string,
    errorMessage: string,
    retryable: boolean,
  ): Promise<void> {
    const item = await this.prisma.fulfillmentItem.findUnique({ where: { id: itemId } });
    if (!item) return;

    const newAttemptCount = item.attemptCount + 1;

    if (retryable && newAttemptCount < MAX_RETRY_ATTEMPTS) {
      // Schedule retry
      const delayMs = RETRY_DELAYS[Math.min(newAttemptCount - 1, RETRY_DELAYS.length - 1)];
      await this.prisma.fulfillmentItem.update({
        where: { id: itemId },
        data: {
          attemptCount: newAttemptCount,
          lastError: `[${errorCode}] ${errorMessage}`,
          nextRetryAt: new Date(Date.now() + delayMs),
        },
      });
      this.logger.warn(`[item=${itemId}] Fulfillment retry ${newAttemptCount}/${MAX_RETRY_ATTEMPTS} in ${delayMs}ms [error=${errorCode}]`);
    } else {
      // Max retries exhausted → FAILED + escalate
      await this.prisma.fulfillmentItem.update({
        where: { id: itemId },
        data: {
          status: 'FAILED',
          attemptCount: newAttemptCount,
          lastError: `[${errorCode}] ${errorMessage}`,
          escalatedAt: new Date(),
        },
      });
      this.logger.error(`[item=${itemId}] Fulfillment FAILED after ${newAttemptCount} attempts: ${errorCode} — ${errorMessage}`);
    }
  }

  /**
   * Check if all fulfillment items are in terminal state → complete session.
   */
  async checkCompletion(checkoutSessionId: string): Promise<void> {
    const items = await this.prisma.fulfillmentItem.findMany({
      where: { checkoutSessionId },
      select: { status: true },
    });

    if (items.length === 0) return;

    const { fulfilled, allConfirmed } = isSessionFullyFulfilled(items.map((i) => i.status));

    if (!fulfilled) return;

    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: checkoutSessionId },
      select: { status: true },
    });
    if (!session) return;

    const targetStatus = allConfirmed ? 'COMPLETED' : 'COMPLETED'; // Even with refunds, session is "done"
    const transition = tryTransitionCheckout(session.status, targetStatus, 'system');

    if (transition.allowed && !transition.noOp) {
      await this.prisma.checkoutSession.update({
        where: { id: checkoutSessionId },
        data: { status: targetStatus, completedAt: new Date() },
      });
      this.logger.log(`[session=${checkoutSessionId}] Session → ${targetStatus} (all items terminal, allConfirmed=${allConfirmed})`);
    }
  }

  /**
   * Retry pending fulfillment items that have a nextRetryAt in the past.
   * Called by cron.
   */
  async retryPendingItems(): Promise<number> {
    const items = await this.prisma.fulfillmentItem.findMany({
      where: {
        status: { in: ['PENDING', 'RESERVING'] },
        nextRetryAt: { lte: new Date() },
        attemptCount: { lt: MAX_RETRY_ATTEMPTS },
      },
      select: { id: true, checkoutSessionId: true },
    });

    const sessionIds = [...new Set(items.map((i) => i.checkoutSessionId))];
    for (const sessionId of sessionIds) {
      await this.executeFulfillment(sessionId);
    }

    return items.length;
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private getProvider(providerName: string): BookingProvider | undefined {
    return this.providers.get(providerName);
  }

  private async markItemFailed(itemId: string, errorCode: string, errorMessage: string): Promise<void> {
    await this.prisma.fulfillmentItem.update({
      where: { id: itemId },
      data: {
        status: 'FAILED',
        lastError: `[${errorCode}] ${errorMessage}`,
        escalatedAt: new Date(),
      },
    });
  }
}
