'use client';

import { useMemo, useState } from 'react';

import { ComparisonTable } from '@/components/landing/ComparisonTable';
import { FilterBar, type FilterState } from '@/components/landing/FilterBar';
import { VariantCards } from '@/components/landing/VariantCard';

interface Variant {
  sessionId: string;
  startsAt: string;
  endsAt?: string;
  availableTickets: number;
  prices: Array<{ type: string; amount?: number; price?: number }>;
  event: {
    id: string;
    title: string;
    slug: string;
    address?: string;
    durationMinutes?: number;
    imageUrl?: string;
    tcEventId: string;
    source: string;
    rating: number;
    reviewCount: number;
    priceFrom?: number;
  };
}

interface Filters {
  piers: string[];
  priceRange: [number, number];
  dateRange: string[];
  dates: string[];
}

function getPrice(v: Variant): number {
  const p = v.prices?.[0];
  // price — цена в копейках; amount — количество мест (teplohod ставит 100)
  const sessionPrice = p?.price ?? p?.amount ?? 0;
  return sessionPrice > 0 ? sessionPrice : (v.event.priceFrom ?? 0);
}

function getHourMinute(iso: string): { h: number; m: number } {
  const d = new Date(iso);
  const moscow = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  return { h: moscow.getHours(), m: moscow.getMinutes() };
}

function matchTimeSlot(iso: string, slot: string): boolean {
  if (!slot) return true;
  const { h, m } = getHourMinute(iso);
  const time = h * 60 + m;
  if (slot === 'before-23:30') return time < 1410 && time >= 360;
  if (slot === '23:30-00:30') return time >= 1410 || time <= 30;
  if (slot === 'after-00:30') return time > 30 && time < 360;
  return true;
}

/** Оценка варианта для «Оптимального выбора» */
function scoreOffer(v: Variant, allPrices: number[]): number {
  const price = getPrice(v);
  const { h, m } = getHourMinute(v.startsAt);
  const timeMin = h * 60 + m;
  // Нормализация: ночные рейсы после полуночи → +1440
  const normTime = timeMin < 720 ? timeMin + 1440 : timeMin;

  // Близость к полуночи (0:00 = 1440 нормализовано)
  const distToMid = Math.abs(normTime - 1440);
  const timeScore = 1 - Math.min(distToMid / 120, 1);

  // Цена
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const priceScore = maxP === minP ? 1 : 1 - (price - minP) / (maxP - minP);

  // Рейтинг
  const ratingScore = Math.min(Number(v.event.rating) / 5, 1);

  // Места
  const seatScore = v.availableTickets <= 0 ? 0 : Math.min(v.availableTickets / 20, 1);

  return 0.35 * timeScore + 0.3 * priceScore + 0.2 * ratingScore + 0.15 * seatScore;
}

function pickOptimal(variants: Variant[]): number | null {
  const available = variants.filter((v) => v.availableTickets > 0);
  if (available.length === 0) return null;
  const prices = available.map(getPrice).filter((p) => p > 0);
  if (prices.length === 0) return null;

  let bestIdx = -1;
  let bestScore = -1;
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (v.availableTickets <= 0) continue;
    const s = scoreOffer(v, prices);
    if (s > bestScore) {
      bestScore = s;
      bestIdx = i;
    }
  }
  return bestIdx >= 0 ? bestIdx : null;
}

function sortVariants(variants: Variant[], sort: string): Variant[] {
  const out = [...variants];
  if (sort === 'price') {
    out.sort((a, b) => getPrice(a) - getPrice(b));
  } else if (sort === 'popular') {
    out.sort((a, b) => Number(b.event.rating) - Number(a.event.rating));
  } else {
    // По времени (default), с нормализацией полуночи
    out.sort((a, b) => {
      const ta = new Date(a.startsAt).getTime();
      const tb = new Date(b.startsAt).getTime();
      return ta - tb;
    });
  }
  return out;
}

export function LandingClient({
  variants: allVariants,
  filters: apiFilters,
}: {
  variants: Variant[];
  filters: Filters;
}) {
  const [filterState, setFilterState] = useState<FilterState>({
    date: '',
    timeSlot: '',
    pier: '',
    maxPrice: null,
    showSoldOut: false,
    sort: 'time',
  });

  const filtered = useMemo(() => {
    return allVariants.filter((v) => {
      // Sold out
      if (!filterState.showSoldOut && v.availableTickets <= 0) return false;
      // Date
      if (filterState.date) {
        const vDate = new Date(v.startsAt).toISOString().slice(0, 10);
        if (vDate !== filterState.date) return false;
      }
      // Time slot
      if (filterState.timeSlot) {
        if (!matchTimeSlot(v.startsAt, filterState.timeSlot)) return false;
      }
      // Pier
      if (filterState.pier) {
        if (!v.event.address?.includes(filterState.pier)) return false;
      }
      // Price
      if (filterState.maxPrice) {
        if (getPrice(v) > filterState.maxPrice) return false;
      }
      return true;
    });
  }, [allVariants, filterState]);

  const sorted = useMemo(() => sortVariants(filtered, filterState.sort), [filtered, filterState.sort]);

  const bestDealIdx = useMemo(() => pickOptimal(sorted), [sorted]);

  return (
    <div className="space-y-4">
      <FilterBar
        piers={apiFilters.piers}
        priceRange={apiFilters.priceRange as [number, number]}
        dates={apiFilters.dates}
        onFilterChange={setFilterState}
      />

      {/* Количество и подсказка */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">
          {sorted.length > 0
            ? `${sorted.length} ${sorted.length === 1 ? 'рейс' : sorted.length < 5 ? 'рейса' : 'рейсов'}`
            : 'Нет рейсов по выбранным фильтрам'}
        </span>
        {bestDealIdx !== null && sorted.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
            ⭐ Оптимальный выбор выделен
          </span>
        )}
      </div>

      {/* Desktop table / Mobile cards */}
      <ComparisonTable variants={sorted} bestDealIdx={bestDealIdx} />
      <VariantCards variants={sorted} bestDealIdx={bestDealIdx} />
    </div>
  );
}
