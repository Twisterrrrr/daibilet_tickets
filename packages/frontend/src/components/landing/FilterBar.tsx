'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';

interface FilterBarProps {
  piers: string[];
  priceRange: [number, number];
  dates: string[];
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  date: string;
  timeSlot: string;
  pier: string;
  maxPrice: number | null;
}

const TIME_SLOTS = [
  { value: '', label: 'Любое время' },
  { value: 'before-23:30', label: 'До 23:30' },
  { value: '23:30-00:30', label: '23:30 — 00:30' },
  { value: 'after-00:30', label: 'После 00:30' },
];

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' });
}

function formatPrice(kopecks: number): string {
  return Math.round(kopecks / 100).toLocaleString('ru-RU') + ' \u20BD';
}

export function FilterBar({ piers, priceRange, dates, onFilterChange }: FilterBarProps) {
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [pier, setPier] = useState('');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  function update(patch: Partial<FilterState>) {
    const next = { date, timeSlot, pier, maxPrice, ...patch };
    if ('date' in patch) setDate(patch.date!);
    if ('timeSlot' in patch) setTimeSlot(patch.timeSlot!);
    if ('pier' in patch) setPier(patch.pier!);
    if ('maxPrice' in patch) setMaxPrice(patch.maxPrice ?? null);
    onFilterChange(next);
  }

  function reset() {
    setDate('');
    setTimeSlot('');
    setPier('');
    setMaxPrice(null);
    onFilterChange({ date: '', timeSlot: '', pier: '', maxPrice: null });
  }

  const hasFilters = date || timeSlot || pier || maxPrice;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Search className="hidden h-5 w-5 text-slate-400 sm:block" />

        {/* Дата */}
        <select
          value={date}
          onChange={(e) => update({ date: e.target.value })}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">Все даты</option>
          {dates.map((d) => (
            <option key={d} value={d}>
              {formatDate(d)}
            </option>
          ))}
        </select>

        {/* Время */}
        <select
          value={timeSlot}
          onChange={(e) => update({ timeSlot: e.target.value })}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          {TIME_SLOTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Причал */}
        {piers.length > 1 && (
          <select
            value={pier}
            onChange={(e) => update({ pier: e.target.value })}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          >
            <option value="">Все причалы</option>
            {piers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}

        {/* Цена */}
        {priceRange[1] > 0 && (
          <select
            value={maxPrice ?? ''}
            onChange={(e) =>
              update({ maxPrice: e.target.value ? Number(e.target.value) : null })
            }
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          >
            <option value="">Любая цена</option>
            {[100000, 200000, 300000, 500000].filter((p) => p <= priceRange[1]).map((p) => (
              <option key={p} value={p}>
                до {formatPrice(p)}
              </option>
            ))}
          </select>
        )}

        {/* Сброс */}
        {hasFilters && (
          <button
            onClick={reset}
            className="ml-auto flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
            Сбросить
          </button>
        )}
      </div>
    </div>
  );
}
