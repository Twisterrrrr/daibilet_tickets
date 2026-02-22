import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../schedule/availability.service';
import { PriceSnapshotService } from '../schedule/price-snapshot.service';
import { PaymentService } from './payment.service';
import type { CheckoutPackageItemType } from '@prisma/client';

export interface CreatePackageItemDto {
  type: CheckoutPackageItemType;
  offerId: string;
  sessionId?: string | null;
  openDate?: string | null;
  qty: number;
}

export interface CreatePackageDto {
  checkoutSessionId: string;
  email: string;
  phone?: string | null;
  items: CreatePackageItemDto[];
}

@Injectable()
export class CheckoutPackageService {
  private readonly logger = new Logger(CheckoutPackageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly priceSnapshot: PriceSnapshotService,
    private readonly payment: PaymentService,
  ) {}

  async create(dto: CreatePackageDto) {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { id: dto.checkoutSessionId },
    });
    if (!session) throw new NotFoundException('Сессия не найдена');
    if (!dto.items?.length) throw new BadRequestException('Добавьте хотя бы один пункт');

    const itemInputs = dto.items.map((it) => ({
      type: it.type,
      offerId: it.offerId,
      sessionId: it.type === 'SESSION' ? it.sessionId : null,
      openDate: it.type === 'OPEN_DATE' && it.openDate ? new Date(it.openDate) : null,
      qty: it.qty,
    }));

    for (const it of itemInputs) {
      await this.availability.checkOrThrow({
        offerId: it.offerId,
        sessionId: it.sessionId,
        qty: it.qty,
        openDate: it.openDate,
      });
    }

    const lineSnapshots: Array<{ snapshot: object; totalKopecks: number }> = [];
    for (const it of itemInputs) {
      const snap = await this.priceSnapshot.buildSnapshot({
        offerId: it.offerId,
        sessionId: it.sessionId,
        qty: it.qty,
        openDate: it.openDate,
      });
      lineSnapshots.push({ snapshot: snap, totalKopecks: snap.totalKopecks });
    }

    const totalKopecks = lineSnapshots.reduce((s, l) => s + l.totalKopecks, 0);
    const priceSnapshotJson = {
      lineItems: lineSnapshots.map((l) => l.snapshot),
      totalKopecks,
      currency: 'RUB',
    };

    const pkg = await this.prisma.checkoutPackage.create({
      data: {
        checkoutSessionId: dto.checkoutSessionId,
        status: 'CREATED',
        email: dto.email,
        phone: dto.phone,
        priceSnapshotJson: priceSnapshotJson as object,
        items: {
          create: itemInputs.map((it, i) => ({
            type: it.type,
            offerId: it.offerId,
            sessionId: it.sessionId,
            openDate: it.openDate,
            qty: it.qty,
            itemSnapshot: lineSnapshots[i].snapshot as object,
          })),
        },
      },
      include: { items: true },
    });

    await this.prisma.checkoutSession.update({
      where: { id: dto.checkoutSessionId },
      data: { status: 'CONFIRMED', totalPrice: totalKopecks },
    });

    const idempotencyKey = `pkg-${pkg.id}`;
    const paymentResult = await this.payment.createPaymentIntentForPackage({
      checkoutSessionId: dto.checkoutSessionId,
      amount: totalKopecks,
      idempotencyKey,
      metadata: { packageId: pkg.id },
    });

    await this.prisma.checkoutPackage.update({
      where: { id: pkg.id },
      data: {
        status: 'LOCKED',
        paymentProvider: paymentResult.provider,
        paymentId: paymentResult.providerPaymentId ?? paymentResult.paymentIntentId,
      },
    });

    return {
      packageId: pkg.id,
      status: 'LOCKED',
      totalKopecks,
      paymentUrl: paymentResult.paymentUrl ?? undefined,
    };
  }

  async getStatus(packageId: string) {
    const pkg = await this.prisma.checkoutPackage.findUnique({
      where: { id: packageId },
      include: { items: { include: { offer: { include: { event: true } } } } },
    });
    if (!pkg) throw new NotFoundException('Пакет не найден');
    return {
      id: pkg.id,
      status: pkg.status,
      email: pkg.email,
      priceSnapshotJson: pkg.priceSnapshotJson,
      items: pkg.items,
    };
  }
}
