import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@/prisma-client';
import { OrderStatus, OrderSource, OrderIngestionSource } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';
import { OrderStatusMapper } from './order-status.mapper';
import type { TeplohodParsedEmail } from '../integrations/providers/teplohod/teplohod-email.parser';

type Nullable<T> = T | null | undefined;

interface TcMirrorOrderInput {
  externalOrderId: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  date?: Date | string | null;
  amount?: number | null;
  currency?: string | null;
  purchasedAt?: Date | string | null;
  rawPayload?: unknown;
}

@Injectable()
export class OrderProjectionService {
  private readonly logger = new Logger(OrderProjectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: OrderStatusMapper,
  ) {}

  async projectFromCheckoutSession(sessionId: string): Promise<void> {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: sessionId },
      include: {
        paymentIntents: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) {
      this.logger.warn(`projectFromCheckoutSession: session not found ${sessionId}`);
      return;
    }

    const paymentIntent = session.paymentIntents[0] ?? null;
    const status = this.mapper.mapCheckout(session, paymentIntent);

    // Временный UX-fallback: предпочитаем title из snapshot (eventTitle),
    // иначе — "Order". В будущем лучше подмешать title из eventId/related entity, если доступно.
    const firstLine = Array.isArray(session.offersSnapshot)
      ? (session.offersSnapshot as Array<{ eventTitle?: string | null }>)[0]
      : undefined;
    const titleSnapshot = (firstLine?.eventTitle || 'Order') as string;

    let amount: number | null = null;
    if (typeof session.totalPrice === 'number') {
      amount = session.totalPrice;
    }

    const existing = await this.prisma.order.findFirst({
      where: { source: OrderSource.INTERNAL, checkoutSessionId: session.id },
    });

    if (!existing) {
      await this.prisma.order.create({
        data: {
          source: OrderSource.INTERNAL,
          ingestionSource: OrderIngestionSource.CHECKOUT,
          checkoutSessionId: session.id,
          packageId: null,
          paymentIntentId: paymentIntent?.id ?? null,

          userId: session.userId ?? null,
          email: session.customerEmail ?? null,
          phone: session.customerPhone ?? null,

          eventId: null,
          titleSnapshot,
          dateSnapshot: null,

          amount,
          currency: 'RUB',

          purchasedAt: session.createdAt,
          status,
        },
      });
      return;
    }

    await this.prisma.order.update({
      where: { id: existing.id },
      data: {
        status,
        amount: amount ?? undefined,
        email: session.customerEmail ?? undefined,
        phone: session.customerPhone ?? undefined,
        paymentIntentId: paymentIntent?.id ?? undefined,
      },
    });
  }

  async upsertFromTcMirror(input: TcMirrorOrderInput): Promise<void> {
    const status = this.mapper.mapTc(input);

    const parseDate = (d: Nullable<Date | string>): Date | null => {
      if (!d) return null;
      if (d instanceof Date) return d;
      const parsed = new Date(d);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const purchasedAt = parseDate(input.purchasedAt) ?? new Date();
    const dateSnapshot = parseDate(input.date);

    // Prisma не поддерживает where по произвольной паре полей без @@unique,
    // поэтому делаем ручной findFirst+create/update.
    const existing = await this.prisma.order.findFirst({
      where: {
        source: OrderSource.TICKETSCLOUD,
        externalOrderId: input.externalOrderId,
      },
    });

    if (!existing) {
      await this.prisma.order.create({
        data: {
          source: OrderSource.TICKETSCLOUD,
          ingestionSource: OrderIngestionSource.TC_MIRROR,
          externalOrderId: input.externalOrderId,

          email: input.email ?? null,
          phone: input.phone ?? null,

          titleSnapshot: input.title || 'TC order',
          dateSnapshot,

          amount: input.amount ?? null,
          currency: input.currency ?? 'RUB',

          purchasedAt,
          status,

          sourcePayload:
            input.rawPayload != null ? (input.rawPayload as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
      return;
    }

    const patch: Prisma.OrderUpdateInput = { status };

    // Мягкий апгрейд: обновляем только если новые значения не пустые.
    if (input.amount != null) patch.amount = input.amount;
    if (input.email != null && String(input.email).trim()) patch.email = input.email;
    if (input.phone != null && String(input.phone).trim()) patch.phone = input.phone;
    if (input.purchasedAt != null) patch.purchasedAt = purchasedAt;
    if (input.rawPayload != null) patch.sourcePayload = input.rawPayload as Prisma.InputJsonValue;

    await this.prisma.order.update({
      where: { id: existing.id },
      data: patch,
    });
  }

  async upsertFromTeplohodParsedEmail(parsed: TeplohodParsedEmail): Promise<void> {
    const status = this.mapper.mapTeplohod(parsed);
    const externalOrderId = parsed.referenceIds?.[0] ?? null;

    const amountRub = parsed.amountsRub?.[0] ?? null;
    const amount = amountRub != null ? Math.round(Number(amountRub) * 100) : null;

    const purchasedAt = new Date();

    const existing = externalOrderId
      ? await this.prisma.order.findFirst({
          where: {
            source: OrderSource.TEPLOHOD,
            externalOrderId,
          },
        })
      : null;

    const createData: Prisma.OrderCreateInput = {
      source: OrderSource.TEPLOHOD,
      ingestionSource: OrderIngestionSource.TEPLOHOD_EMAIL,
      externalOrderId,
      status,
      userId: null,
      email: null,
      phone: null,
      eventId: null,
      titleSnapshot: 'Teplohod',
      dateSnapshot: null,
      amount,
      currency: 'RUB',
      purchasedAt,
      sourcePayload: parsed as unknown as Prisma.InputJsonValue,
    };

    if (!existing) {
      await this.prisma.order.create({ data: createData });
      return;
    }

    await this.prisma.order.update({
      where: { id: existing.id },
      data: {
        status,
        amount: amount ?? undefined,
        purchasedAt,
        sourcePayload: parsed as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async reconcileByCheckoutSession(sessionId: string): Promise<void> {
    await this.projectFromCheckoutSession(sessionId);
  }
}

