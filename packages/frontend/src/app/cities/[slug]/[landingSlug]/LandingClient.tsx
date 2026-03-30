'use client';

import { moscowCalendarDayFromIso } from '@daibilet/shared';
import { useMemo, useState } from 'react';

import type { LandingTimeSlotMode } from '@/app/cities/_landingVm';
import { ComparisonTable } from '@/components/landing/ComparisonTable';
import { FilterBar, type FilterState } from '@/components/landing/FilterBar';
import { VariantCards } from '@/components/landing/VariantCard';
import type { LandingFilters, LandingVariant } from '../../_landingVm';

type Variant = LandingVariant;
type Filters = LandingFilters;

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

function matchTimeSlot(iso: string, slot: string, mode: LandingTimeSlotMode): boolean {
  if (!slot || mode === 'hidden') return true;
  const { h, m } = getHourMinute(iso);
  const time = h * 60 + m;
  if (mode === 'evening') {
    if (slot === 'ev-17-19') return time >= 17 * 60 && time < 19 * 60;
    if (slot === 'ev-19-21') return time >= 19 * 60 && time < 21 * 60;
    if (slot === 'ev-21-plus') return time >= 21 * 60 || time < 3 * 60;
    return true;
  }
  if (slot === 'before-23:30') return time < 1410 && time >= 360;
  if (slot === '23:30-00:30') return time >= 1410 || time <= 30;
  if (slot === 'after-00:30') return time > 30 && time < 360;
  return true;
}

const FILTER_BAR_COPY: Record<
  LandingTimeSlotMode,
  { title?: string; subtitle?: string }
> = {
  night: {},
  evening: {
    title: 'Подберите день и время',
    subtitle:
      'Сначала выберите дату (чипы или календарь), затем при необходимости сузьте интервал отправления — строки таблицы соответствуют фильтрам.',
  },
  hidden: {
    title: 'Подберите вариант',
    subtitle:
      'Выберите день с сеансами, при необходимости причал и цену — список ниже обновляется так же, как на лендинге ночных мостов.',
  },
};

/** Оценка варианта для «Оптимального выбора» */
function scoreOffer(v: Variant, allPrices: number[]): number {
  const price = getPrice(v);
  let timeScore = 0.5;
  if (v.startsAt) {
    const { h, m } = getHourMinute(v.startsAt);
    const timeMin = h * 60 + m;
    const normTime = timeMin < 720 ? timeMin + 1440 : timeMin;
    const distToMid = Math.abs(normTime - 1440);
    timeScore = 1 - Math.min(distToMid / 120, 1);
  }

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
      if (!a.startsAt && !b.startsAt) return 0;
      if (!a.startsAt) return 1;
      if (!b.startsAt) return -1;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
  }
  return out;
}

export function LandingClient({
  variants: allVariants,
  filters: apiFilters,
  templateType,
  timeSlotMode = 'night',
}: {
  variants: Variant[];
  filters: Filters;
  templateType: 'GENERIC_CARDS' | 'COMPARISON_TABLE' | 'HYBRID' | 'SEASONAL_EVENT';
  timeSlotMode?: LandingTimeSlotMode;
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
        if (!v.startsAt) return false;
        if (moscowCalendarDayFromIso(v.startsAt) !== filterState.date) return false;
      }
      // Time slot
      if (filterState.timeSlot) {
        if (!v.startsAt) return false;
        if (!matchTimeSlot(v.startsAt, filterState.timeSlot, timeSlotMode)) return false;
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
  }, [allVariants, filterState, timeSlotMode]);

  const sorted = useMemo(() => sortVariants(filtered, filterState.sort), [filtered, filterState.sort]);

  const bestDealIdx = useMemo(() => pickOptimal(sorted), [sorted]);

  const filterCopy = FILTER_BAR_COPY[timeSlotMode];

  return (
    <div className="space-y-4">
      <FilterBar
        piers={apiFilters.piers}
        priceRange={apiFilters.priceRange as [number, number]}
        dates={apiFilters.dates}
        timeSlotMode={timeSlotMode}
        onFilterChange={setFilterState}
        filterTitle={filterCopy.title}
        filterSubtitle={filterCopy.subtitle}
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

      {/* Таблица: COMPARISON_TABLE и HYBRID — на всех ширинах (горизонтальный скролл на телефоне) */}
      {(templateType === 'COMPARISON_TABLE' || templateType === 'HYBRID') && (
        <ComparisonTable variants={sorted} bestDealIdx={bestDealIdx} />
      )}
      {/* Карточки: только GENERIC / SEASONAL (без дубля с таблицей в HYBRID) */}
      {(templateType === 'GENERIC_CARDS' || templateType === 'SEASONAL_EVENT') && (
        <VariantCards variants={sorted} bestDealIdx={bestDealIdx} />
      )}
    </div>
  );
}
