/**
 * RefundExecutionService — исполнение возвратов при approve.
 * R3: PLATFORM — YooKassa refund, LedgerEntry, TicketIssued.status
 * R4: EXTERNAL — FORWARDED, provider contact, задача для админа
 */
import { Injectable, Logger } from '@nestjs/common';

import { PaymentService } from '../checkout/payment.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefundExecutionService {
  private readonly logger = new Logger(RefundExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  async executeOnApprove(refundRequestId: string): Promise<{ status: string; refundId?: string }> {
    const rr = await this.prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
      include: { ticket: true },
    });
    if (!rr || rr.status !== 'APPROVED') return { status: 'skipped' };

    const amount = rr.approvedAmountCents ?? rr.requestedAmountCents ?? 0;
    if (amount <= 0) return { status: 'skipped_no_amount' };

    if (rr.paymentMode === 'PLATFORM') {
      return this.executePlatformRefund(rr, amount);
    }
    if (rr.paymentMode === 'EXTERNAL') {
      return this.executeExternalForward(rr, amount);
    }
    return { status: 'unsupported_mode' };
  }

  private async executePlatformRefund(
    rr: { id: string; packageId: string | null; ticketId: string | null; paymentRef: string | null },
    amountCents: number,
  ): Promise<{ status: string; refundId?: string }> {
    let providerPaymentId = rr.paymentRef;
    if (!providerPaymentId && rr.packageId) {
      const pkg = await this.prisma.checkoutPackage.findUnique({
        where: { id: rr.packageId },
        select: { paymentId: true, checkoutSessionId: true },
      });
      providerPaymentId = pkg?.paymentId ?? null;
      if (!providerPaymentId && pkg?.checkoutSessionId) {
        const intent = await this.prisma.paymentIntent.findFirst({
          where: { checkoutSessionId: pkg.checkoutSessionId, status: 'PAID' },
        });
        providerPaymentId = intent?.providerPaymentId ?? null;
      }
    }
    if (!providerPaymentId) {
      this.logger.warn(`[refund=${rr.id}] No providerPaymentId for PLATFORM refund`);
      await this.prisma.refundRequest.update({
        where: { id: rr.id },
        data: { status: 'FAILED', comment: 'Не найден providerPaymentId для возврата' },
      });
      return { status: 'failed' };
    }

    try {
      const result = await this.paymentService.createYookassaRefund({
        providerPaymentId,
        amount: amountCents,
        description: `RefundRequest ${rr.id}`,
      });

      await this.prisma.refundRequest.update({
        where: { id: rr.id },
        data: {
          status: 'REFUNDED',
          refundedAmountCents: amountCents,
          refundProviderRef: result.refundId ?? undefined,
          closedAt: new Date(),
        },
      });

      if (rr.ticketId) {
        await this.prisma.ticketIssued.update({
          where: { id: rr.ticketId },
          data: { status: 'REFUNDED', refundedAt: new Date() },
        });
      }

      await this.prisma.ledgerEntry.create({
        data: {
          entryType: 'REFUND_TICKET',
          amountCents: -amountCents,
          currency: 'RUB',
          ticketId: rr.ticketId ?? undefined,
          refundRequestId: rr.id,
          paymentRef: result.refundId ?? undefined,
          memo: `RefundRequest ${rr.id}`,
        },
      });

      this.logger.log(`[refund=${rr.id}] PLATFORM refund OK: ${result.refundId}`);
      return { status: 'refunded', refundId: result.refundId ?? undefined };
    } catch (e) {
      this.logger.error(`[refund=${rr.id}] PLATFORM refund failed: ${(e as Error).message}`);
      await this.prisma.refundRequest.update({
        where: { id: rr.id },
        data: { status: 'FAILED', comment: (e as Error).message },
      });
      return { status: 'failed' };
    }
  }

  private async executeExternalForward(
    rr: { id: string; provider: string | null; providerOrderRef: string | null; providerTicketRef: string | null },
    _amountCents: number,
  ): Promise<{ status: string }> {
    await this.prisma.refundRequest.update({
      where: { id: rr.id },
      data: {
        status: 'FORWARDED',
        forwardingChannel: 'EMAIL',
        forwardedAt: new Date(),
        providerSupportEmail:
          rr.provider === 'TEPLOHOD'
            ? 'support@teplohod.info'
            : rr.provider === 'TICKETS_CLOUD'
              ? 'support@ticketscloud.com'
              : null,
      },
    });
    this.logger.log(`[refund=${rr.id}] EXTERNAL forwarded to ${rr.provider}, awaiting admin close`);
    return { status: 'forwarded' };
  }
}
