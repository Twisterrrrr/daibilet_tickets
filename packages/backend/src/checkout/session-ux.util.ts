/**
 * Session UX helpers: badges, price hint, sold-out recommendations.
 * Scarcity использует getScarcityState из @daibilet/shared.
 */

import { getScarcityState } from '@daibilet/shared';
export { getScarcityState };

export interface SessionForScoring {
  id: string;
  startsAt: Date | string;
  price?: number | null;
  available: number;
  isSoldOut: boolean;
  soldLast24h?: number | null;
  capacity?: number | null;
}

export interface SessionBadge {
  key: string;
  label: string;
}

/** Бейджи для сеанса: Сегодня, Самый популярный, Лучшая цена */
export function getSessionBadges(
  session: SessionForScoring,
  allSessions: SessionForScoring[],
): SessionBadge[] {
  const badges: SessionBadge[] = [];
  const now = new Date();
  const sessionStart = new Date(session.startsAt);

  const isToday =
    sessionStart.getUTCDate() === now.getUTCDate() &&
    sessionStart.getUTCMonth() === now.getUTCMonth() &&
    sessionStart.getUTCFullYear() === now.getUTCFullYear();
  if (isToday && !session.isSoldOut) {
    badges.push({ key: 'today', label: 'Сегодня' });
  }

  const availableSessions = allSessions.filter((s) => !s.isSoldOut);
  const minPrice = Math.min(
    ...availableSessions.map((s) => s.price ?? Infinity).filter(Number.isFinite),
    Infinity,
  );
  if (Number.isFinite(minPrice) && session.price === minPrice && !session.isSoldOut) {
    badges.push({ key: 'best_price', label: 'Лучшая цена' });
  }

  const popular = availableSessions.filter((s) => (s.soldLast24h ?? 0) > 0);
  const maxSold = Math.max(0, ...popular.map((s) => s.soldLast24h ?? 0));
  if (maxSold > 0 && (session.soldLast24h ?? 0) >= maxSold && !session.isSoldOut) {
    badges.push({ key: 'popular', label: 'Самый популярный' });
  }

  return badges;
}

/** Поиск более дешёвого сеанса для подсказки */
export function findCheaperAlternative(
  currentSession: { id: string; price?: number | null },
  allSessions: Array<{ id: string; price?: number | null; isSoldOut?: boolean }>,
  minDiffKopecks = 20000, // 200 руб
  minDiffPercent = 10,
): { sessionId: string; price: number; savingsKopecks: number } | null {
  const currentPrice = currentSession.price ?? 0;
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;

  const available = allSessions.filter((s) => s.id !== currentSession.id && !s.isSoldOut);
  let best: { id: string; price: number; savings: number } | null = null;

  for (const s of available) {
    const p = s.price ?? 0;
    if (!Number.isFinite(p) || p >= currentPrice) continue;
    const savings = currentPrice - p;
    const diffPct = (savings / currentPrice) * 100;
    if (savings >= minDiffKopecks || diffPct >= minDiffPercent) {
      if (!best || savings > best.savings) {
        best = { id: s.id, price: p, savings };
      }
    }
  }
  return best ? { sessionId: best.id, price: best.price, savingsKopecks: best.savings } : null;
}

/** Альтернативные сеансы при sold out */
export function getRecommendedSessionsForSoldOut(
  soldOutSessionId: string,
  allSessions: Array<{
    id: string;
    startsAt: Date | string;
    price?: number | null;
    available: number;
    isSoldOut: boolean;
  }>,
  limit = 3,
): Array<{ id: string; startsAt: Date | string; price?: number | null }> {
  const available = allSessions
    .filter((s) => s.id !== soldOutSessionId && !s.isSoldOut && s.available > 0)
    .slice()
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  return available.slice(0, limit).map((s) => ({
    id: s.id,
    startsAt: s.startsAt,
    price: s.price,
  }));
}
