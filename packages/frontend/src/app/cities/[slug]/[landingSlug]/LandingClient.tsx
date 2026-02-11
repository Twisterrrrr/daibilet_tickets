'use client';

import { useState, useMemo } from 'react';
import { FilterBar, type FilterState } from '@/components/landing/FilterBar';
import { ComparisonTable } from '@/components/landing/ComparisonTable';
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
  return p?.amount ?? p?.price ?? v.event.priceFrom ?? 0;
}

function getHourMinute(iso: string): { h: number; m: number } {
  const d = new Date(iso);
  // Moscow timezone offset approximation
  const moscow = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  return { h: moscow.getHours(), m: moscow.getMinutes() };
}

function matchTimeSlot(iso: string, slot: string): boolean {
  if (!slot) return true;
  const { h, m } = getHourMinute(iso);
  const time = h * 60 + m;
  // Обработка полуночного перехода: 23:30 = 1410, 00:30 = 30
  if (slot === 'before-23:30') return time < 1410 && time >= 360; // 06:00-23:30
  if (slot === '23:30-00:30') return time >= 1410 || time <= 30;
  if (slot === 'after-00:30') return time > 30 && time < 360; // 00:30-06:00
  return true;
}

/** Найти лучший вариант по цена/длительность */
function findBestDeal(variants: Variant[]): number | null {
  if (variants.length === 0) return null;
  let bestIdx = 0;
  let bestScore = Infinity;
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (v.availableTickets <= 0) continue;
    const price = getPrice(v);
    const dur = v.event.durationMinutes || 60;
    const score = price / dur; // kopecks per minute
    if (price > 0 && score < bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestScore < Infinity ? bestIdx : null;
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
  });

  const filtered = useMemo(() => {
    return allVariants.filter((v) => {
      // Date filter
      if (filterState.date) {
        const vDate = new Date(v.startsAt).toISOString().slice(0, 10);
        if (vDate !== filterState.date) return false;
      }
      // Time slot filter
      if (filterState.timeSlot) {
        if (!matchTimeSlot(v.startsAt, filterState.timeSlot)) return false;
      }
      // Pier filter
      if (filterState.pier) {
        if (!v.event.address?.includes(filterState.pier)) return false;
      }
      // Price filter
      if (filterState.maxPrice) {
        const price = getPrice(v);
        if (price > filterState.maxPrice) return false;
      }
      return true;
    });
  }, [allVariants, filterState]);

  const bestDealIdx = useMemo(() => findBestDeal(filtered), [filtered]);

  return (
    <div className="space-y-4">
      <FilterBar
        piers={apiFilters.piers}
        priceRange={apiFilters.priceRange as [number, number]}
        dates={apiFilters.dates}
        onFilterChange={setFilterState}
      />

      {/* Количество результатов */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {filtered.length > 0
            ? `Найдено: ${filtered.length} ${filtered.length === 1 ? 'рейс' : filtered.length < 5 ? 'рейса' : 'рейсов'}`
            : 'Ничего не найдено'}
        </span>
        {bestDealIdx !== null && filtered.length > 0 && (
          <span className="text-amber-600">
            Лучший выбор отмечен звездой
          </span>
        )}
      </div>

      {/* Desktop: table, Mobile: cards */}
      <ComparisonTable variants={filtered} bestDealIdx={bestDealIdx} />
      <VariantCards variants={filtered} bestDealIdx={bestDealIdx} />
    </div>
  );
}
