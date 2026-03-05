/**
 * PaymentIntent service — слой абстракции платежей.
 *
 * Провайдеры: STUB (dev/staging), YOOKASSA (production).
 * Выбор через env PAYMENT_PROVIDER.
 *
 * Инварианты:
 * - Один PaymentIntent на одну попытку оплаты.
 * - idempotencyKey защищает от дублей.
 * - Сумма берётся ТОЛЬКО из offersSnapshot (immutable).
 * - PAID → FulfillmentService → COMPLETED (не напрямую).
 */

import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { partitionCart, SnapshotLineItem } from './cart-partitioning';
import { tryTransitionCheckout, tryTransitionPayment } from './checkout-state-machine';
import { isYkPayment, YkPayment, YkRefund } from './yookassa.types';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly appUrl: string;
  private readonly provider: string;
  private readonly yookassaShopId: string;
  private readonly yookassaSecretKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.appUrl =
      process.env.NODE_ENV === 'production'
        ? this.config.getOrThrow<string>('APP_URL')
        : this.config.get<string>('APP_URL', 'http://localhost:3000');
    this.provider = this.config.get<string>('PAYMENT_PROVIDER', 'STUB');
    this.yookassaShopId = this.config.get<string>('YOOKASSA_SHOP_ID', '');
    this.yookassaSecretKey = this.config.get<string>('YOOKASSA_SECRET_KEY', '');
  }

  /**
   * Создать PaymentIntent для CheckoutSession.
   *
   * @param checkoutSessionId — ID сессии
   * @param idempotencyKey — ключ для защиты от дублей (frontend генерирует uuid)
   * @returns PaymentIntent с payment_url
   */
  async createPaymentIntent(checkoutSessionId: string, idempotencyKey?: string) {
    // Проверяем сессию
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: checkoutSessionId },
    });
    if (!session) throw new NotFoundException('CheckoutSession не найдена');

    // Проверяем: сессия должна быть в CONFIRMED или AWAITING_PAYMENT
    if (!['CONFIRMED', 'AWAITING_PAYMENT'].includes(session.status)) {
      throw new BadRequestException(
        `Оплата доступна только для CONFIRMED/AWAITING_PAYMENT сессий (текущий: ${session.status})`,
      );
    }

    const key = idempotencyKey || randomUUID();

    // Idempotency: если intent с таким ключом уже есть — вернём его
    const existing = await this.prisma.paymentIntent.findUnique({
      where: { idempotencyKey: key },
    });
    if (existing) {
      this.logger.debug(`PaymentIntent already exists for key=${key}, returning existing`);
      return {
        paymentIntentId: existing.id,
        paymentUrl: existing.paymentUrl,
        amount: existing.amount,
        currency: existing.currency,
        provider: existing.provider,
        status: existing.status,
      };
    }

    // Проверяем: нет ли уже активного (PENDING/PROCESSING) intent для этой сессии
    const activeIntent = await this.prisma.paymentIntent.findFirst({
      where: {
        checkoutSessionId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });
    if (activeIntent) {
      throw new ConflictException(
        `Уже есть активный PaymentIntent (${activeIntent.id}) для этой сессии. ` + `Дождитесь завершения или отмените.`,
      );
    }

    // ============================================
    // INVARIANT: offersSnapshot immutability after PaymentIntent creation
    // ============================================
    // Если для этой сессии уже создавался хотя бы один PaymentIntent,
    // snapshot не должен был измениться (гарантия: платим ровно за то, что было).
    const anyPreviousIntent = await this.prisma.paymentIntent.findFirst({
      where: { checkoutSessionId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, amount: true, grossAmount: true },
    });

    if (anyPreviousIntent) {
      const giftCertSnap = session.giftCertificateSnapshot as { amount: number } | null;
      const appliedCert = session.appliedGiftCertificateSnapshot as { discountAmount: number } | null | undefined;
      let currentTotal: number;
      if (giftCertSnap?.amount) {
        currentTotal = Number(giftCertSnap.amount);
      } else {
        const pt = partitionCart((session.offersSnapshot as SnapshotLineItem[] | null) || []).platformTotal;
        currentTotal = appliedCert?.discountAmount ? Math.max(0, pt - appliedCert.discountAmount) : pt;
      }
      if (anyPreviousIntent.grossAmount && currentTotal !== anyPreviousIntent.grossAmount) {
        this.logger.error(
          `INVARIANT VIOLATION: snapshot amount changed after PaymentIntent creation. ` +
            `Session=${checkoutSessionId}, previousAmount=${anyPreviousIntent.grossAmount}, currentAmount=${currentTotal}`,
        );
        throw new ConflictException('offersSnapshot был изменён после создания PaymentIntent. Это запрещено.');
      }
    }

    // ============================================
    // Amount from snapshot / gift certificate
    // ============================================
    const giftCert = session.giftCertificateSnapshot as { amount: number } | null;
    let grossAmount: number;
    let supplierId: string | null = null;
    let platformFee: number | null = null;
    let supplierAmount: number | null = null;
    let commissionRate: number | null = null;

    if (giftCert?.amount) {
      // Подарочный сертификат: сумма из snapshot
      grossAmount = Number(giftCert.amount);
      if (grossAmount <= 0) {
        throw new BadRequestException('Некорректная сумма сертификата');
      }
    } else {
      const snapshot = (session.offersSnapshot as SnapshotLineItem[] | null) || [];
      const partitioned = partitionCart(snapshot);

      // Платим только за PLATFORM позиции (EXTERNAL оплачиваются у провайдера)
      let platformTotal = partitioned.platformTotal;
      const appliedCert = session.appliedGiftCertificateSnapshot as { discountAmount: number } | null | undefined;
      if (appliedCert?.discountAmount) {
        platformTotal = Math.max(0, platformTotal - appliedCert.discountAmount);
      }
      grossAmount = platformTotal;
      if (grossAmount <= 0) {
        throw new BadRequestException('Нет PLATFORM-позиций для оплаты (сумма = 0)');
      }

      // Commission из snapshot (уже рассчитана и заморожена)
      const suppliersInPlatform = partitioned.platform.filter((s) => s.supplierId);
      if (suppliersInPlatform.length > 0) {
        const first = suppliersInPlatform[0];
        supplierId = first.supplierId;
        commissionRate = first.commissionRateSnapshot;
        platformFee = partitioned.platform.reduce((sum, s) => sum + (s.platformFeeSnapshot || 0), 0);
        supplierAmount = grossAmount - platformFee;
      }
    }

    // ============================================
    // Provider: STUB / YOOKASSA
    // ============================================
    let paymentUrl: string;
    let providerPaymentId: string | null = null;
    let providerData: Record<string, unknown> | null = null;

    if (this.provider === 'STUB') {
      providerPaymentId = `stub_${randomUUID().slice(0, 8)}`;
      paymentUrl = `${this.appUrl}/checkout/pay-mock/${providerPaymentId}`;
      const snapshot = giftCert ? [] : (session.offersSnapshot as SnapshotLineItem[] | null) || [];
      const partitioned = partitionCart(snapshot);
      providerData = {
        mock: true,
        supplierId,
        platformFee,
        supplierAmount,
        platformItemCount: giftCert ? 0 : partitioned.platform.length,
        externalItemCount: giftCert ? 0 : partitioned.external.length,
        note: giftCert
          ? 'STUB gift certificate'
          : 'STUB payment — POST /checkout/payment/:id/simulate-paid для имитации',
      };
    } else if (this.provider === 'YOOKASSA') {
      const ykResult = await this.createYookassaPayment({
        amount: grossAmount,
        currency: 'RUB',
        idempotencyKey: key,
        returnUrl: `${this.appUrl}/checkout/result?session=${checkoutSessionId}`,
        description: `Заказ ${session.shortCode}`,
        metadata: {
          paymentIntentId: key,
          checkoutSessionId,
        },
        supplierId,
        supplierAmount,
      });
      providerPaymentId = ykResult.paymentId;
      paymentUrl = ykResult.confirmationUrl;
      providerData = ykResult.rawResponse;
    } else {
      throw new BadRequestException(`Провайдер "${this.provider}" не поддерживается`);
    }

    // Переводим сессию в AWAITING_PAYMENT
    const csTransition = tryTransitionCheckout(session.status, 'AWAITING_PAYMENT', 'system');
    if (csTransition.allowed && !csTransition.noOp) {
      await this.prisma.checkoutSession.update({
        where: { id: checkoutSessionId },
        data: { status: 'AWAITING_PAYMENT' },
      });
    }

    const intent = await this.prisma.paymentIntent.create({
      data: {
        checkoutSessionId,
        idempotencyKey: key,
        amount: grossAmount,
        currency: 'RUB',
        status: 'PENDING',
        provider: this.provider,
        providerPaymentId,
        providerData: providerData as unknown as Prisma.InputJsonValue,
        paymentUrl,
        // Marketplace split
        supplierId,
        grossAmount,
        platformFee,
        supplierAmount,
        commissionRate,
      },
    });

    this.logger.log(
      `[intent=${intent.id}] [provider=${this.provider}] [providerPmtId=${providerPaymentId}] ` +
        `Created PaymentIntent for session ${checkoutSessionId}, amount=${grossAmount}, supplierId=${supplierId}`,
    );

    return {
      paymentIntentId: intent.id,
      paymentUrl: intent.paymentUrl,
      amount: intent.amount,
      currency: intent.currency,
      provider: intent.provider,
      status: intent.status,
    };
  }

  /**
   * Получить PaymentIntent по ID.
   */
  async getPaymentIntent(id: string) {
    const intent = await this.prisma.paymentIntent.findUnique({ where: { id } });
    if (!intent) throw new NotFoundException('PaymentIntent не найден');
    return intent;
  }

  /**
   * Получить все intents для сессии.
   */
  async getIntentsForSession(checkoutSessionId: string) {
    return this.prisma.paymentIntent.findMany({
      where: { checkoutSessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Обработать подтверждение оплаты (webhook / simulate).
   *
   * PAID → CheckoutSession.COMPLETED (через state machine).
   */
  async markPaid(intentId: string, providerPaymentId?: string) {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
      include: { checkoutSession: true },
    });
    if (!intent) throw new NotFoundException('PaymentIntent не найден');

    // State machine: PaymentIntent → PAID
    const payResult = tryTransitionPayment(intent.status, 'PAID', 'system');
    if (payResult.noOp) return intent; // уже PAID
    if (!payResult.allowed) throw new BadRequestException(payResult.reason);

    // State machine: CheckoutSession → COMPLETED
    const csResult = tryTransitionCheckout(intent.checkoutSession.status, 'COMPLETED', 'system');

    return this.prisma.$transaction(async (tx) => {
      const updatedIntent = await tx.paymentIntent.update({
        where: { id: intentId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          ...(providerPaymentId && { providerPaymentId }),
        },
      });

      // Переводим сессию в COMPLETED (если переход разрешён)
      if (csResult.allowed && !csResult.noOp) {
        await tx.checkoutSession.update({
          where: { id: intent.checkoutSessionId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        this.logger.log(
          `[intent=${intentId}] [provider=${intent.provider}] [providerPmtId=${intent.providerPaymentId}] ` +
            `Session ${intent.checkoutSessionId} → COMPLETED`,
        );
      }

      // Инкрементируем successfulSales для поставщика
      if (intent.supplierId) {
        await tx.operator
          .update({
            where: { id: intent.supplierId },
            data: { successfulSales: { increment: 1 } },
          })
          .catch((e) => this.logger.error('payment callback failed: ' + (e as Error).message));
      }

      return updatedIntent;
    }).then(async (updatedIntent) => {
      // T25: при PAID → order-confirmed. Ошибка письма не ломает checkout.
      const session = await this.prisma.checkoutSession.findUnique({
        where: { id: intent.checkoutSessionId },
        select: {
          customerEmail: true,
          customerName: true,
          shortCode: true,
          offersSnapshot: true,
          giftCertificateSnapshot: true,
          totalPrice: true,
        },
      });
      if (session?.customerEmail && csResult.allowed && !csResult.noOp) {
        const giftCert = session.giftCertificateSnapshot as { amount?: number } | null;
        const items: Array<{ title: string; quantity: number; price: number }> = [];
        let totalPrice = 0;
        if (giftCert?.amount) {
          items.push({ title: 'Подарочный сертификат', quantity: 1, price: Math.round(giftCert.amount / 100) });
          totalPrice = Math.round(giftCert.amount / 100);
        } else {
          const snapshot = (session.offersSnapshot as SnapshotLineItem[] | null) || [];
          for (const s of snapshot) {
            items.push({
              title: s.eventTitle || 'Билет',
              quantity: s.quantity,
              price: Math.round(s.lineTotal / 100),
            });
            totalPrice += Math.round(s.lineTotal / 100);
          }
        }
        const snapshotItems = (session.offersSnapshot as SnapshotLineItem[] | null) || [];
        const operationalItems = snapshotItems
          .filter((s: SnapshotLineItem) => s.meetingPoint || s.meetingInstructions || s.operationalPhone || s.operationalNote)
          .map((s: SnapshotLineItem) => ({
            eventTitle: s.eventTitle,
            meetingPoint: s.meetingPoint,
            meetingInstructions: s.meetingInstructions,
            operationalPhone: s.operationalPhone,
            operationalNote: s.operationalNote,
          }));
        this.mailService
          .sendOrderConfirmed(session.customerEmail, {
            customerName: session.customerName || 'Клиент',
            shortCode: session.shortCode,
            items,
            totalPrice: totalPrice || Math.round((session.totalPrice ?? 0) / 100),
            operationalItems: operationalItems.length > 0 ? operationalItems : undefined,
          })
          .catch((e) =>
            this.logger.error(
              `[intent=${intentId}] Order-confirmed email failed: ${e instanceof Error ? e.message : String(e)}`,
            ),
          );
      }
      return updatedIntent;
    });
  }

  /**
   * Обработать ошибку оплаты.
   */
  async markFailed(intentId: string, reason?: string) {
    const intent = await this.prisma.paymentIntent.findUnique({ where: { id: intentId } });
    if (!intent) throw new NotFoundException('PaymentIntent не найден');

    const result = tryTransitionPayment(intent.status, 'FAILED', 'system');
    if (result.noOp) return intent;
    if (!result.allowed) throw new BadRequestException(result.reason);

    const updated = await this.prisma.paymentIntent.update({
      where: { id: intentId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        failReason: reason || 'unknown',
      },
    });

    this.logger.error(
      `[paymentId=${intentId}] [provider=${intent.provider}] [providerPmtId=${intent.providerPaymentId}] ` +
        `[checkoutSessionId=${intent.checkoutSessionId}] PAYMENT_FAILED: ${reason || 'unknown'}`,
    );
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(`PAYMENT_FAILED: ${reason || 'unknown'}`, {
        level: 'error',
        tags: {
          paymentIntentId: intentId,
          provider: intent.provider,
          checkoutSessionId: intent.checkoutSessionId,
          env: process.env.NODE_ENV,
        },
        extra: { failReason: reason },
      });
    }

    return updated;
  }

  /**
   * Отменить intent (user-driven).
   */
  async cancelIntent(intentId: string) {
    const intent = await this.prisma.paymentIntent.findUnique({ where: { id: intentId } });
    if (!intent) throw new NotFoundException('PaymentIntent не найден');

    const result = tryTransitionPayment(intent.status, 'CANCELLED', 'user');
    if (result.noOp) return intent;
    if (!result.allowed) throw new BadRequestException(result.reason);

    return this.prisma.paymentIntent.update({
      where: { id: intentId },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * STUB: Симулировать оплату (для тестирования).
   * Только в dev / staging.
   */
  async simulatePaid(intentId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('simulate-paid недоступен в production');
    }

    this.logger.warn(`SIMULATING payment for intent ${intentId}`);
    return this.markPaid(intentId, `sim_${Date.now()}`);
  }

  // ============================================
  // YooKassa API integration
  // ============================================

  /**
   * Создать платёж в YooKassa.
   * https://yookassa.ru/developers/api#create_payment
   */
  private async createYookassaPayment(params: {
    amount: number;
    currency: string;
    idempotencyKey: string;
    returnUrl: string;
    description: string;
    metadata: Record<string, string>;
    supplierId: string | null;
    supplierAmount: number | null;
  }): Promise<{ paymentId: string; confirmationUrl: string; rawResponse: Record<string, unknown> }> {
    const { amount, currency, idempotencyKey, returnUrl, description, metadata, supplierId, supplierAmount } = params;

    // Build request body
    const body: Record<string, unknown> = {
      amount: {
        value: (amount / 100).toFixed(2),
        currency,
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      description,
      metadata,
    };

    // Marketplace split: transfers to supplier
    if (supplierId && supplierAmount && supplierAmount > 0) {
      const supplier = await this.prisma.operator.findUnique({
        where: { id: supplierId },
        select: { yookassaAccountId: true },
      });
      if (supplier?.yookassaAccountId) {
        body.transfers = [
          {
            account_id: supplier.yookassaAccountId,
            amount: {
              value: (supplierAmount / 100).toFixed(2),
              currency,
            },
          },
        ];
      }
    }

    // Call YooKassa API
    const auth = Buffer.from(`${this.yookassaShopId}:${this.yookassaSecretKey}`).toString('base64');
    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        'Idempotence-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`YooKassa createPayment failed: ${response.status} ${errorBody}`);
      throw new BadRequestException(`YooKassa error: ${response.status}`);
    }

    const data = await response.json();

    if (!isYkPayment(data)) {
      this.logger.error('YooKassa: invalid payment response structure');
      throw new BadRequestException('YooKassa: невалидный ответ');
    }

    const payment = data as YkPayment;
    if (!payment.confirmation?.confirmation_url) {
      this.logger.error('YooKassa: no confirmation_url in response');
      throw new BadRequestException('YooKassa: нет URL для оплаты');
    }

    return {
      paymentId: payment.id,
      confirmationUrl: payment.confirmation.confirmation_url,
      rawResponse: payment as unknown as Record<string, unknown>,
    };
  }

  /**
   * Создать рефанд в YooKassa.
   * https://yookassa.ru/developers/api#create_refund
   */
  async createYookassaRefund(params: {
    providerPaymentId: string;
    amount: number;
    currency?: string;
    description?: string;
  }): Promise<{ refundId: string; status: string; rawResponse: Record<string, unknown> }> {
    const { providerPaymentId, amount, currency = 'RUB', description } = params;

    const body: Record<string, unknown> = {
      payment_id: providerPaymentId,
      amount: {
        value: (amount / 100).toFixed(2),
        currency,
      },
    };
    if (description) body.description = description;

    const auth = Buffer.from(`${this.yookassaShopId}:${this.yookassaSecretKey}`).toString('base64');
    const idempotencyKey = randomUUID();

    const response = await fetch('https://api.yookassa.ru/v3/refunds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        'Idempotence-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`YooKassa refund failed: ${response.status} ${errorBody}`);
      throw new BadRequestException(`YooKassa refund error: ${response.status}`);
    }

    const data = (await response.json()) as YkRefund;

    return {
      refundId: data.id,
      status: data.status,
      rawResponse: data as unknown as Record<string, unknown>,
    };
  }

  // ============================================
  // YooKassa Webhook IP Whitelist
  // ============================================

  /** YooKassa webhook IP ranges (from documentation) */
  static readonly YOOKASSA_IPS = [
    '185.71.76.0/27',
    '185.71.77.0/27',
    '77.75.153.0/25',
    '77.75.156.11',
    '77.75.156.35',
    '77.75.154.128/25',
    '2a02:5180::/32',
  ];

  /**
   * Проверить, что IP входит в whitelist YooKassa.
   * Для production: обязательно.
   */
  isYookassaIp(ip: string): boolean {
    if (process.env.NODE_ENV !== 'production') return true;
    // Simple check for exact IPs first
    for (const allowed of PaymentService.YOOKASSA_IPS) {
      if (!allowed.includes('/')) {
        if (ip === allowed) return true;
        continue;
      }
      // CIDR check
      if (this.isIpInCidr(ip, allowed)) return true;
    }
    return false;
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    if (cidr.includes(':')) return false; // Skip IPv6 for now
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr, 10);
    const ipNum = this.ipToNum(ip);
    const rangeNum = this.ipToNum(range);
    if (ipNum === 0 || rangeNum === 0) return false;
    const mask = (-1 << (32 - bits)) >>> 0;
    return (ipNum & mask) === (rangeNum & mask);
  }

  private ipToNum(ip: string): number {
    const parts = ip.split('.');
    if (parts.length !== 4) return 0;
    return parts.reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }
}
