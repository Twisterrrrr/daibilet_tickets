import { Injectable } from '@nestjs/common';

import { PricingService, type MarkupContext } from '../pricing/pricing.service';
import { PrismaService } from '../prisma/prisma.service';

export interface PriceSnapshotInput {
  offerId: string;
  sessionId?: string | null;
  categoryId?: string | null;
  qty: number;
  openDate?: Date | null;
}

export interface PriceSnapshot {
  basePrice: number;
  compareAtPriceCents?: number | null;
  fees: number;
  commission: number;
  currency: string;
  lineItems: Array<{ name: string; priceKopecks: number; compareAtPriceCents?: number | null; qty: number }>;
  calculatedAt: string;
  pricingVersion?: number;
  totalKopecks: number;
}

@Injectable()
export class PriceSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async buildSnapshot(input: PriceSnapshotInput): Promise<PriceSnapshot> {
    const { offerId, sessionId, categoryId, qty, openDate } = input;
    if (qty <= 0) throw new Error('qty must be > 0');

    const offer = await this.prisma.eventOffer.findUnique({
      where: { id: offerId },
      include: { event: true, ticketCategories: true, ticketPrices: true },
    });
    if (!offer) throw new Error(`Offer ${offerId} not found`);

    let basePriceKopecks = offer.priceFrom ?? 0;
    let compareAtPriceCents: number | null = null;

    // T6: If TariffCategory exists, use TicketPrice.priceCents/compareAtPriceCents
    if (categoryId) {
      const price = await this.prisma.ticketPrice.findFirst({
        where: {
          offerId,
          categoryId,
          status: 'ACTIVE',
          validTo: null,
        },
      });
      if (price) {
        basePriceKopecks = price.priceCents;
        compareAtPriceCents = price.compareAtPriceCents;
      }
    }

    if (basePriceKopecks === 0 && sessionId) {
      const session = await this.prisma.eventSession.findFirst({
        where: { id: sessionId, offerId },
      });
      if (session?.prices && Array.isArray(session.prices)) {
        const first = (session.prices as Array<{ price?: number; amount?: number }>)[0];
        basePriceKopecks = first?.price ?? first?.amount ?? offer.priceFrom ?? 0;
      }
    }

    if (basePriceKopecks === 0) basePriceKopecks = offer.priceFrom ?? 0;

    const dateStr = openDate ? openDate.toISOString().slice(0, 10) : undefined;
    const context: MarkupContext = {
      dateFrom: dateStr,
      citySlug: offer.event?.cityId ? undefined : undefined,
    };
    const breakdown = await this.pricing.calculateBreakdown(basePriceKopecks, qty, [], context);

    const lineItems: PriceSnapshot['lineItems'] = [
      {
        name: 'Билет',
        priceKopecks: basePriceKopecks,
        ...(compareAtPriceCents != null && { compareAtPriceCents }),
        qty,
      },
    ];
    if (breakdown.serviceFee > 0) {
      lineItems.push({ name: 'Сервисный сбор', priceKopecks: breakdown.serviceFee, qty: 1 });
    }
    if (breakdown.markup > 0) {
      lineItems.push({ name: 'Наценка', priceKopecks: breakdown.markup, qty: 1 });
    }

    const totalKopecks = breakdown.grandTotal;
    const fees = breakdown.serviceFee + breakdown.markup;
    const commission = breakdown.estimatedCommission;

    return {
      basePrice: basePriceKopecks,
      ...(compareAtPriceCents != null && { compareAtPriceCents }),
      fees,
      commission,
      currency: 'RUB',
      lineItems,
      calculatedAt: new Date().toISOString(),
      pricingVersion: 1,
      totalKopecks,
    };
  }
}
