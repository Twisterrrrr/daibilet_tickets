/**
 * Публичный каталог: правила «sellable» (SELLABLE) без изменения DTO/API.
 * CATALOG_STRICT_MODE=1 — фильтр на уровне Prisma where; иначе только логи.
 */

import { Injectable, Logger } from '@nestjs/common';
import { DateMode, OfferStatus, PriceMode, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/** Коды причин, почему событие не продаётся в каталоге. */
export type CatalogGuardReasonCode =
  | 'NO_CATEGORY'
  | 'NO_AUDIENCE'
  | 'MISSING_LOCATION'
  | 'NO_ACTIVE_OFFERS'
  | 'NO_PRICE'
  | 'NO_SESSIONS';

export type CatalogGuardEvaluateResult = {
  sellable: boolean;
  reasons: CatalogGuardReasonCode[];
};

export type CatalogGuardOfferSlice = {
  status: OfferStatus | string;
  isDeleted?: boolean | null;
  priceFrom?: number | null;
  priceMode?: PriceMode | string;
  minAmount?: number | null;
  meetingPoint?: string | null;
};

export type CatalogGuardSessionSlice = {
  isActive: boolean;
  startsAt: Date | string;
};

export type CatalogGuardEventSlice = {
  category?: unknown;
  audience?: unknown;
  dateMode: DateMode | string;
  endDate?: Date | string | null;
  venueId?: string | null;
  address?: string | null;
  meetingPoint?: string | null;
};

function nonEmpty(s: string | null | undefined): boolean {
  return typeof s === 'string' && s.trim().length > 0;
}

function hasValidPrice(o: CatalogGuardOfferSlice): boolean {
  if (o.priceMode === PriceMode.OPEN_PRICE || o.priceMode === 'OPEN_PRICE') {
    return o.minAmount != null && typeof o.minAmount === 'number' && o.minAmount > 0;
  }
  return o.priceFrom != null && typeof o.priceFrom === 'number' && o.priceFrom > 0;
}

@Injectable()
export class CatalogGuardService {
  private readonly logger = new Logger(CatalogGuardService.name);

  constructor(private readonly prisma: PrismaService) {}

  isCatalogStrictMode(): boolean {
    return process.env.CATALOG_STRICT_MODE === '1';
  }

  /**
   * Проверка sellable по уже смерженным полям события и полным спискам офферов/сеансов.
   */
  evaluateSellable(
    event: CatalogGuardEventSlice,
    offers: CatalogGuardOfferSlice[],
    sessions: CatalogGuardSessionSlice[],
    now: Date = new Date(),
  ): CatalogGuardEvaluateResult {
    const reasons: CatalogGuardReasonCode[] = [];

    if (event.category == null) {
      reasons.push('NO_CATEGORY');
    }

    if (event.audience == null) {
      reasons.push('NO_AUDIENCE');
    }

    const activeOffers = offers.filter((o) => !o.isDeleted && o.status === OfferStatus.ACTIVE);
    if (activeOffers.length === 0) {
      reasons.push('NO_ACTIVE_OFFERS');
    } else {
      const anyPrice = activeOffers.some((o) => hasValidPrice(o));
      if (!anyPrice) {
        reasons.push('NO_PRICE');
      }
    }

    const hasLocation =
      !!event.venueId ||
      nonEmpty(event.address) ||
      nonEmpty(event.meetingPoint) ||
      offers.some((o) => !o.isDeleted && nonEmpty(o.meetingPoint ?? undefined));
    if (!hasLocation) {
      reasons.push('MISSING_LOCATION');
    }

    if (event.dateMode === DateMode.SCHEDULED || event.dateMode === 'SCHEDULED') {
      const future = sessions.some((s) => {
        if (!s.isActive) return false;
        return new Date(s.startsAt) > now;
      });
      if (!future) {
        reasons.push('NO_SESSIONS');
      }
    } else if (event.dateMode === DateMode.OPEN_DATE || event.dateMode === 'OPEN_DATE') {
      const end = event.endDate ? new Date(event.endDate) : null;
      if (end != null && end < now) {
        reasons.push('NO_SESSIONS');
      }
    }

    const sellable = reasons.length === 0;
    return { sellable, reasons };
  }

  isSellable(
    event: CatalogGuardEventSlice,
    offers: CatalogGuardOfferSlice[],
    sessions: CatalogGuardSessionSlice[],
    now?: Date,
  ): boolean {
    return this.evaluateSellable(event, offers, sessions, now).sellable;
  }

  /**
   * Расширение Prisma where для STRICT-режима (один источник правды с evaluateSellable насколько возможно в SQL).
   */
  buildSellableWhereExtension(now: Date = new Date()): Prisma.EventWhereInput {
    const activeOfferWithPrice: Prisma.EventOfferWhereInput = {
      isDeleted: false,
      status: OfferStatus.ACTIVE,
      OR: [
        { priceFrom: { gt: 0 } },
        { AND: [{ priceMode: PriceMode.OPEN_PRICE }, { minAmount: { gt: 0 } }] },
      ],
    };

    return {
      AND: [
        {
          OR: [
            { venueId: { not: null } },
            { NOT: { address: null } },
            { NOT: { meetingPoint: null } },
            {
              offers: {
                some: {
                  isDeleted: false,
                  status: OfferStatus.ACTIVE,
                  NOT: { meetingPoint: null },
                },
              },
            },
          ],
        },
        { offers: { some: activeOfferWithPrice } },
        {
          OR: [
            {
              dateMode: DateMode.SCHEDULED,
              sessions: { some: { isActive: true, startsAt: { gt: now } } },
            },
            {
              dateMode: DateMode.OPEN_DATE,
              OR: [{ endDate: null }, { endDate: { gte: now } }],
            },
          ],
        },
      ],
    };
  }

  /**
   * Агрегированный отчёт по listable-событиям (админ).
   */
  async getSellabilityReport(): Promise<{
    total: number;
    sellable: number;
    sellablePercent: number;
    breakdown: Record<CatalogGuardReasonCode, number>;
  }> {
    const now = new Date();
    const base: Prisma.EventWhereInput = {
      isActive: true,
      isDeleted: false,
      canonicalOfId: null,
    };

    const rows = await this.prisma.event.findMany({
      where: base,
      select: {
        id: true,
        category: true,
        audience: true,
        dateMode: true,
        endDate: true,
        venueId: true,
        address: true,
        meetingPoint: true,
        offers: {
          where: { isDeleted: false },
          select: {
            status: true,
            isDeleted: true,
            priceFrom: true,
            priceMode: true,
            minAmount: true,
            meetingPoint: true,
          },
        },
        sessions: {
          where: { isActive: true },
          select: { isActive: true, startsAt: true },
        },
      },
    });

    const breakdown: Record<CatalogGuardReasonCode, number> = {
      NO_CATEGORY: 0,
      NO_AUDIENCE: 0,
      MISSING_LOCATION: 0,
      NO_ACTIVE_OFFERS: 0,
      NO_PRICE: 0,
      NO_SESSIONS: 0,
    };

    let sellable = 0;
    for (const row of rows) {
      const { sellable: ok, reasons } = this.evaluateSellable(row, row.offers, row.sessions, now);
      if (ok) {
        sellable += 1;
      } else {
        for (const r of reasons) {
          breakdown[r] += 1;
        }
      }
    }

    const total = rows.length;
    const sellablePercent = total === 0 ? 0 : Math.round((sellable / total) * 10000) / 100;

    return {
      total,
      sellable,
      sellablePercent,
      breakdown,
    };
  }

  logReject(eventId: string, reasons: CatalogGuardReasonCode[]): void {
    this.logger.log({
      msg: 'catalog.guard.reject',
      eventId,
      reasons,
    });
  }
}
