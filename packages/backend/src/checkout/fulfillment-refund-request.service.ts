/**
 * MVP: заявки на возврат по FulfillmentItem (без переписывания RefundService / checkout flow).
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { RefundRequestReason, RefundRequestStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { evaluateRefundEligibility } from './refund-eligibility';
import { PaymentService } from './payment.service';

const ACTIVE_REFUND_STATUSES: RefundRequestStatus[] = ['CREATED', 'APPROVED', 'PROCESSING'];

function parseRefundReason(raw?: string): RefundRequestReason {
  if (!raw) return RefundRequestReason.OTHER;
  const u = raw.trim().toUpperCase();
  if (u === 'USER_REQUEST') return RefundRequestReason.USER_REQUEST;
  if (u === 'EVENT_CANCELLED') return RefundRequestReason.EVENT_CANCELLED;
  if (u === 'SUPPORT') return RefundRequestReason.SUPPORT;
  return RefundRequestReason.OTHER;
}

@Injectable()
export class FulfillmentRefundRequestService {
  private readonly logger = new Logger(FulfillmentRefundRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  async createForItem(params: {
    fulfillmentItemId: string;
    reason?: string;
    reasonNote?: string | null;
  }): Promise<{ refundId: string; status: RefundRequestStatus; amount: number; currency: string }> {
    const { fulfillmentItemId } = params;
    const reason = parseRefundReason(params.reason);

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.fulfillmentItem.findUnique({
        where: { id: fulfillmentItemId },
        include: {
          checkoutSession: { select: { id: true, offersSnapshot: true } },
        },
      });
      if (!item) throw new NotFoundException('Позиция заказа не найдена');

      const existing = await tx.refundRequest.findFirst({
        where: {
          fulfillmentItemId,
          status: { in: [...ACTIVE_REFUND_STATUSES, 'COMPLETED'] },
        },
      });
      if (existing) {
        throw new ConflictException('Для этой позиции уже есть заявка или выполнен возврат');
      }

      const intent = await tx.paymentIntent.findFirst({
        where: { checkoutSessionId: item.checkoutSessionId, status: 'PAID' },
        orderBy: { paidAt: 'desc' },
      });
      if (!intent) {
        throw new BadRequestException('Нет оплаченного платежа для этой сессии');
      }

      const snapshot = item.checkoutSession.offersSnapshot as
        | Array<{ sessionId?: string | null; quantity?: number }>
        | null;
      const line = Array.isArray(snapshot) ? snapshot[item.lineItemIndex] : undefined;
      const sessionId = line?.sessionId ?? null;

      const offer = await tx.eventOffer.findUnique({
        where: { id: item.offerId },
        select: { eventId: true },
      });
      const event = offer
        ? await tx.event.findUnique({
            where: { id: offer.eventId },
            select: { dateMode: true, endDate: true },
          })
        : null;

      let sessionStartsAt: Date | null = null;
      let sessionCancelledBypass = false;
      if (sessionId) {
        const es = await tx.eventSession.findUnique({
          where: { id: sessionId },
          select: { startsAt: true, canceledAt: true },
        });
        sessionStartsAt = es?.startsAt ?? null;
        sessionCancelledBypass = es?.canceledAt != null;
      }

      const eligibility = evaluateRefundEligibility({
        now: new Date(),
        itemStatus: item.status,
        isRedeemed: item.isRedeemed,
        eventDateMode: event?.dateMode ?? null,
        eventEndDate: event?.endDate ?? null,
        sessionStartsAt,
        sessionCancelledBypass,
      });
      if (!eligibility.canRefund) {
        throw new BadRequestException(`Возврат недоступен: ${eligibility.reason}`);
      }

      const created = await tx.refundRequest.create({
        data: {
          fulfillmentItemId,
          paymentIntentId: intent.id,
          amount: item.amount,
          currency: intent.currency ?? 'RUB',
          reason,
          reasonNote: params.reasonNote ?? null,
          status: 'CREATED',
          createdByType: 'ADMIN',
        },
      });

      await tx.fulfillmentItem.update({
        where: { id: fulfillmentItemId },
        data: { status: 'REFUND_PENDING' },
      });

      return {
        refundId: created.id,
        status: created.status,
        amount: created.amount,
        currency: created.currency,
      };
    });
  }

  async approve(refundId: string): Promise<{ refundId: string; status: RefundRequestStatus }> {
    const updated = await this.prisma.refundRequest.updateMany({
      where: { id: refundId, status: 'CREATED' },
      data: { status: 'APPROVED' },
    });
    if (updated.count === 0) {
      const row = await this.prisma.refundRequest.findUnique({ where: { id: refundId } });
      if (!row) throw new NotFoundException('Заявка не найдена');
      throw new BadRequestException('Одобрение возможно только для статуса CREATED');
    }
    return { refundId, status: 'APPROVED' };
  }

  async reject(refundId: string): Promise<{ refundId: string; status: RefundRequestStatus }> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.refundRequest.findUnique({
        where: { id: refundId },
        include: { fulfillmentItem: { select: { id: true, status: true } } },
      });
      if (!row) throw new NotFoundException('Заявка не найдена');
      if (!['CREATED', 'APPROVED'].includes(row.status)) {
        throw new BadRequestException('Отклонение возможно только для CREATED/APPROVED');
      }
      await tx.refundRequest.update({
        where: { id: refundId },
        data: { status: 'REJECTED', processedAt: new Date() },
      });
      if (row.fulfillmentItem.status === 'REFUND_PENDING') {
        await tx.fulfillmentItem.update({
          where: { id: row.fulfillmentItemId },
          data: { status: 'CONFIRMED' },
        });
      }
      return { refundId, status: 'REJECTED' };
    });
  }

  /**
   * Идемпотентно: повтор при COMPLETED — без повторного списания; при PROCESSING — повторный вызов провайдера с тем же Idempotence-Key.
   */
  async process(refundId: string): Promise<{
    refundId: string;
    status: RefundRequestStatus;
    amount: number;
    providerRefundId?: string | null;
    idempotentReplay?: boolean;
  }> {
    let row = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        fulfillmentItem: true,
        paymentIntent: true,
      },
    });
    if (!row) throw new NotFoundException('Заявка не найдена');

    if (row.status === 'COMPLETED') {
      return {
        refundId,
        status: 'COMPLETED',
        amount: row.amount,
        providerRefundId: row.fulfillmentItem.refundId,
        idempotentReplay: true,
      };
    }
    if (row.status === 'REJECTED' || row.status === 'FAILED') {
      throw new BadRequestException(`Заявка в статусе ${row.status}, обработка невозможна`);
    }

    const transitioned = await this.prisma.refundRequest.updateMany({
      where: { id: refundId, status: { in: ['CREATED', 'APPROVED'] } },
      data: { status: 'PROCESSING' },
    });
    if (transitioned.count === 0 && row.status !== 'PROCESSING') {
      row = await this.prisma.refundRequest.findUnique({
        where: { id: refundId },
        include: { fulfillmentItem: true, paymentIntent: true },
      });
      if (row?.status === 'COMPLETED') {
        return {
          refundId,
          status: 'COMPLETED',
          amount: row.amount,
          providerRefundId: row.fulfillmentItem.refundId,
          idempotentReplay: true,
        };
      }
      if (row?.status !== 'PROCESSING') {
        throw new BadRequestException('Некорректный статус для обработки');
      }
    }

    row = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        fulfillmentItem: true,
        paymentIntent: true,
      },
    });
    if (!row || !row.fulfillmentItem || !row.paymentIntent) {
      throw new NotFoundException('Заявка или связанные сущности не найдены');
    }

    let providerRefundId: string | null = null;
    try {
      if (row.paymentIntent.provider === 'YOOKASSA' && row.paymentIntent.providerPaymentId) {
        const yk = await this.paymentService.createYookassaRefund({
          providerPaymentId: row.paymentIntent.providerPaymentId,
          amount: row.amount,
          currency: row.currency,
          description: `Item refund ${row.fulfillmentItemId}`,
          idempotencyKey: `refund:fulfillment-request:${refundId}`,
        });
        providerRefundId = yk.refundId;
      } else {
        providerRefundId = `stub-refund-${refundId}`;
        this.logger.log(`STUB refund for request ${refundId}, amount=${row.amount}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Refund process failed for ${refundId}: ${msg}`);
      await this.failRefund(refundId, row.fulfillmentItemId);
      throw new BadRequestException(`Ошибка возврата у провайдера: ${msg}`);
    }

    await this.completeRefund(refundId, row.fulfillmentItemId, row.amount, providerRefundId);
    return { refundId, status: 'COMPLETED', amount: row.amount, providerRefundId };
  }

  private async failRefund(refundId: string, fulfillmentItemId: string): Promise<void> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.refundRequest.update({
        where: { id: refundId },
        data: { status: 'FAILED', processedAt: new Date() },
      });
      await tx.fulfillmentItem.update({
        where: { id: fulfillmentItemId },
        data: { status: 'CONFIRMED' },
      });
    });
  }

  private async completeRefund(
    refundId: string,
    fulfillmentItemId: string,
    amount: number,
    providerRefundId: string | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.refundRequest.updateMany({
        where: { id: refundId, status: 'PROCESSING' },
        data: { status: 'COMPLETED', processedAt: new Date() },
      });
      if (updated.count === 0) {
        const r = await tx.refundRequest.findUnique({ where: { id: refundId } });
        if (r?.status === 'COMPLETED') return;
        throw new BadRequestException('Конфликт статуса при завершении возврата');
      }

      await tx.fulfillmentItem.update({
        where: { id: fulfillmentItemId },
        data: {
          status: 'REFUNDED',
          refundedAmount: amount,
          refundId: providerRefundId,
        },
      });

      const item = await tx.fulfillmentItem.findUnique({
        where: { id: fulfillmentItemId },
        include: { checkoutSession: { select: { offersSnapshot: true } } },
      });
      if (!item) return;
      const snapshot = item.checkoutSession.offersSnapshot as
        | Array<{ sessionId?: string | null; quantity?: number }>
        | null;
      const line = Array.isArray(snapshot) ? snapshot[item.lineItemIndex] : undefined;
      const sessionId = line?.sessionId ?? null;
      const qty = Math.max(0, Math.floor(Number(line?.quantity ?? 0)));
      if (sessionId && qty > 0) {
        await tx.eventSession.update({
          where: { id: sessionId },
          data: { availableTickets: { increment: qty } },
        });
      }
    });
  }
}
