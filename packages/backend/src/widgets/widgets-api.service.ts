import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

type WidgetSessionScarcity = 'NONE' | 'LOW' | 'LAST';

export type WidgetSessionDto = {
  id: string;
  startsAt: string;
  price?: number | null;
  available: number;
  isActive: boolean;
  isSoldOut: boolean;
  isLocked?: boolean;
  lockReason?: 'SOLD' | 'PAST' | 'IMPORTED' | 'STOPPED';
  scarcityLevel: WidgetSessionScarcity;
  tags: Array<'SOONEST' | 'BEST_PRICE' | 'POPULAR'>;
};

export type WidgetEventResponse = {
  event: {
    id: string;
    slug: string;
    eventSlug: string;
    title: string;
    imageUrl?: string | null;
    priceFrom?: number | null;
    currency: 'RUB';
  };
  sessions: WidgetSessionDto[];
};

/** Cart snapshot item shape (widget/checkout). */
type CartSnapshotItem = { eventId?: string; sessionId?: string; quantity?: number };

@Injectable()
export class WidgetsApiService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * C4: Aggregate holds from active CheckoutSessions (STARTED, VALIDATED, REDIRECTED, expiresAt > now).
   * Key: "eventId:sessionId", value: sum of quantity.
   */
  private async getHoldsMap(eventId: string): Promise<Map<string, number>> {
    const now = new Date();
    const sessions = await this.prisma.checkoutSession.findMany({
      where: {
        status: { in: ['STARTED', 'VALIDATED', 'REDIRECTED'] },
        expiresAt: { not: null, gt: now },
      },
      select: { cartSnapshot: true },
    });

    const map = new Map<string, number>();
    for (const row of sessions) {
      const cart = row.cartSnapshot as CartSnapshotItem[] | null;
      if (!Array.isArray(cart)) continue;
      for (const item of cart) {
        const eid = item?.eventId ?? '';
        const sid = item?.sessionId ?? '';
        const qty = Math.max(0, Math.floor(Number(item?.quantity ?? 0)));
        if (!eid || !sid || qty <= 0) continue;
        if (eid !== eventId) continue;
        const key = `${eid}:${sid}`;
        map.set(key, (map.get(key) ?? 0) + qty);
      }
    }
    return map;
  }

  /**
   * Paid count per sessionId (PackageItem where Package.status = PAID).
   */
  private async getPaidBySessionId(sessionIds: string[]): Promise<Map<string, number>> {
    if (sessionIds.length === 0) return new Map();
    const items = await this.prisma.packageItem.findMany({
      where: {
        sessionId: { in: sessionIds },
        package: { status: 'PAID' },
      },
      select: { sessionId: true, adultTickets: true, childTickets: true },
    });
    const map = new Map<string, number>();
    for (const item of items) {
      const qty = (item.adultTickets ?? 0) + (item.childTickets ?? 0);
      map.set(item.sessionId, (map.get(item.sessionId) ?? 0) + qty);
    }
    return map;
  }

  async getEventWithSessions(eventId?: string | null): Promise<WidgetEventResponse> {
    const rawId = (eventId ?? '').trim();
    if (!rawId) {
      throw new BadRequestException({ code: 'EVENT_ID_REQUIRED', message: 'eventId is required' });
    }

    const now = new Date();

    const event = await this.prisma.event.findFirst({
      where: {
        id: rawId,
        isActive: true,
        isDeleted: false,
      },
      include: {
        sessions: {
          where: {
            isActive: true,
            canceledAt: null,
            startsAt: { gt: now },
          },
          orderBy: { startsAt: 'asc' },
          take: 30,
        },
      },
    });

    if (!event) {
      throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Событие не найдено' });
    }

    const [holdsMap, paidMap] = await Promise.all([
      this.getHoldsMap(event.id),
      this.getPaidBySessionId(event.sessions.map((s) => s.id)),
    ]);

    const defaultCap = Number(event.defaultCapacityTotal ?? 0);

    let sessions: WidgetSessionDto[] = event.sessions.map((s) => {
      const rawAvailable =
        (s.availableTickets ?? undefined) != null
          ? Number(s.availableTickets)
          : Number(s.capacityTotal ?? defaultCap);
      const capacity = Math.max(0, Math.floor(Number.isFinite(rawAvailable) ? rawAvailable : 0));
      const holds = holdsMap.get(`${event.id}:${s.id}`) ?? 0;
      const paid = paidMap.get(s.id) ?? 0;
      const effectiveAvailable = Math.max(0, capacity - paid - holds);

      const isSoldOut = effectiveAvailable <= 0;
      const scarcityLevel: WidgetSessionScarcity =
        effectiveAvailable <= 3 ? 'LAST' : effectiveAvailable <= 10 ? 'LOW' : 'NONE';

      let price: number | null | undefined = null;
      if (Array.isArray(s.prices) && s.prices.length > 0) {
        const first = s.prices[0] as { price?: number };
        if (first && typeof first.price === 'number') {
          price = first.price;
        }
      }
      const finalPrice = price ?? event.priceFrom ?? null;

      return {
        id: s.id,
        startsAt: s.startsAt.toISOString(),
        price: finalPrice,
        available: effectiveAvailable,
        isActive: s.isActive && !s.canceledAt,
        isSoldOut,
        isLocked: false,
        scarcityLevel,
        tags: [],
      };
    });

    // C2: Sort — available first, then by startsAt, then by price
    sessions = sessions.slice().sort((a, b) => {
      if (a.isSoldOut !== b.isSoldOut) return a.isSoldOut ? 1 : -1;
      const aStart = event.sessions.find((x) => x.id === a.id)?.startsAt?.getTime() ?? 0;
      const bStart = event.sessions.find((x) => x.id === b.id)?.startsAt?.getTime() ?? 0;
      if (aStart !== bStart) return aStart - bStart;
      const ap = a.price ?? 0;
      const bp = b.price ?? 0;
      return ap - bp;
    });

    // C2: Tags — SOONEST (first by startsAt among available), BEST_PRICE (min price), POPULAR (available < capacity*0.3)
    const byStartsAt = [...sessions].sort((a, b) => {
      const aStart = event.sessions.find((x) => x.id === a.id)?.startsAt?.getTime() ?? 0;
      const bStart = event.sessions.find((x) => x.id === b.id)?.startsAt?.getTime() ?? 0;
      return aStart - bStart;
    });
    const soonestId = byStartsAt.find((x) => !x.isSoldOut)?.id;
    const minPrice = Math.min(
      ...sessions.filter((x) => !x.isSoldOut && x.price != null).map((x) => x.price as number),
      Infinity,
    );
    const hasMinPrice = Number.isFinite(minPrice);

    sessions = sessions.map((s) => {
      const tags: Array<'SOONEST' | 'BEST_PRICE' | 'POPULAR'> = [];
      if (soonestId && s.id === soonestId) tags.push('SOONEST');
      if (hasMinPrice && s.price === minPrice && !s.isSoldOut) tags.push('BEST_PRICE');
      const capacityForSession = (() => {
        const sess = event.sessions.find((x) => x.id === s.id);
        if (!sess) return 0;
        const raw =
          (sess.availableTickets ?? undefined) != null
            ? Number(sess.availableTickets)
            : Number(sess.capacityTotal ?? defaultCap);
        return Math.max(0, Math.floor(Number.isFinite(raw) ? raw : 0));
      })();
      if (capacityForSession > 0 && s.available < capacityForSession * 0.3 && !s.isSoldOut) {
        tags.push('POPULAR');
      }
      return { ...s, tags };
    });

    return {
      event: {
        id: event.id,
        slug: event.slug,
        eventSlug: event.slug,
        title: event.title,
        imageUrl: event.imageUrl,
        priceFrom: event.priceFrom,
        currency: 'RUB',
      },
      sessions,
    };
  }
}

