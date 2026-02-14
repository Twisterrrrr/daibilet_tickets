import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CheckoutStatus } from '@prisma/client';
import {
  tryTransitionOrderRequest,
  tryTransitionCheckout,
  determineExpireReason,
  CHECKOUT_TERMINAL,
} from '../checkout/checkout-state-machine';

/**
 * Cron-сервис для автоматического истечения OrderRequest и CheckoutSession по SLA/TTL.
 *
 * Каждую минуту:
 * 1. Находит PENDING-заявки с expiresAt < NOW()
 * 2. Проверяет через state machine (actor: system)
 * 3. Переводит в EXPIRED с expireReason
 * 4. Истекает non-terminal CheckoutSession с expiresAt < NOW()
 */
@Injectable()
export class OrderExpiryService {
  private readonly logger = new Logger(OrderExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpireRequests() {
    const now = new Date();

    // --- OrderRequests ---
    // Выборка по составному индексу (status, expiresAt)
    const pendingExpired = await this.prisma.orderRequest.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { not: null, lt: now },
      },
      select: {
        id: true,
        status: true,
        checkoutSessionId: true,
        slaMinutes: true,
        expiresAt: true,
        createdAt: true,
        customerEmail: true,
        customerName: true,
      },
    });

    let expiredCount = 0;
    for (const req of pendingExpired) {
      // Validate transition via state machine (actor: system)
      const transition = tryTransitionOrderRequest(req.status, 'EXPIRED', 'system');
      if (transition.noOp) continue;
      if (!transition.allowed) {
        this.logger.warn(`Cannot expire OrderRequest ${req.id}: ${transition.reason}`);
        continue;
      }

      const reason = determineExpireReason(req);

      await this.prisma.orderRequest.update({
        where: { id: req.id },
        data: {
          status: 'EXPIRED',
          expireReason: reason,
        },
      });
      expiredCount++;

      // Send expired email
      if (req.customerEmail && req.checkoutSessionId) {
        const session = await this.prisma.checkoutSession.findUnique({
          where: { id: req.checkoutSessionId },
          select: { shortCode: true },
        });
        if (session) {
          this.mailService.sendOrderExpired(req.customerEmail, {
            customerName: req.customerName || 'Клиент',
            shortCode: session.shortCode,
            reason: reason === 'SLA' ? 'Оператор не успел подтвердить вовремя' : 'Истекло время ожидания',
          }).catch((e) => this.logger.error('Expiry email failed: ' + e.message));
        }
      }
    }

    if (expiredCount > 0) {
      this.logger.log(`Expired ${expiredCount} order request(s) by SLA/TTL`);
    }

    // --- CheckoutSessions ---
    const terminalArray = Array.from(CHECKOUT_TERMINAL).map(String);
    const sessionsToExpire = await this.prisma.checkoutSession.findMany({
      where: {
        status: { notIn: terminalArray as CheckoutStatus[] },
        expiresAt: { not: null, lt: now },
      },
      select: { id: true, status: true },
    });

    let sessionExpiredCount = 0;
    for (const session of sessionsToExpire) {
      // Validate transition via state machine (actor: system)
      const transition = tryTransitionCheckout(session.status, 'EXPIRED', 'system');
      if (transition.noOp) continue;
      if (!transition.allowed) {
        this.logger.warn(`Cannot expire CheckoutSession ${session.id}: ${transition.reason}`);
        continue;
      }

      await this.prisma.checkoutSession.update({
        where: { id: session.id },
        data: { status: CheckoutStatus.EXPIRED },
      });
      sessionExpiredCount++;
    }

    if (sessionExpiredCount > 0) {
      this.logger.log(`Expired ${sessionExpiredCount} checkout session(s) by TTL`);
    }
  }
}
