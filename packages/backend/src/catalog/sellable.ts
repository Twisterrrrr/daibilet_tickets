/**
 * Publish-gate: проверка, что событие можно продавать (есть цена и будущая доступность).
 * PR-3 (A3): нормализация offers + publish-gate.
 */

import { DateMode } from '@prisma/client';

export interface SellableOffer {
  status: string;
  isDeleted?: boolean;
  priceFrom?: number | null;
}

export interface SellableSession {
  isActive: boolean;
  startsAt: Date | string;
  availableTickets?: number | null;
}

export interface SellableEvent {
  dateMode: string;
  endDate?: Date | string | null;
}

/**
 * Проверяет, что событие sellable: есть ACTIVE оффер с ценой и будущая доступность.
 * - SCHEDULED: хотя бы один ACTIVE оффер с priceFrom > 0 и будущий сеанс (isActive, startsAt > now)
 * - OPEN_DATE: хотя бы один ACTIVE оффер с priceFrom > 0 и (endDate null или >= now)
 */
export function isSellable(
  event: SellableEvent,
  offers: SellableOffer[],
  sessions: SellableSession[],
  now: Date = new Date(),
): boolean {
  const activeOffersWithPrice = offers.filter(
    (o) =>
      !o.isDeleted &&
      o.status === 'ACTIVE' &&
      o.priceFrom != null &&
      typeof o.priceFrom === 'number' &&
      o.priceFrom > 0,
  );
  if (activeOffersWithPrice.length === 0) return false;

  if (event.dateMode === DateMode.OPEN_DATE) {
    const endDate = event.endDate ? new Date(event.endDate) : null;
    return endDate === null || endDate >= now;
  }

  // SCHEDULED: нужен хотя бы один будущий активный сеанс (с местами опционально — TC может не отдавать 0)
  const futureSession = sessions.find((s) => {
    if (!s.isActive) return false;
    const start = new Date(s.startsAt);
    return start > now;
  });
  return !!futureSession;
}
