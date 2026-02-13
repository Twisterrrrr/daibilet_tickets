'use client';

import { useState, useCallback } from 'react';
import { X, RotateCcw } from 'lucide-react';

export interface FilterState {
  date: string;
  timeSlot: string;
  pier: string;
  maxPrice: number | null;
  showSoldOut: boolean;
  sort: string;
}

interface FilterBarProps {
  piers: string[];
  priceRange: [number, number];
  dates: string[];
  onFilterChange: (filters: FilterState) => void;
}

const TIME_SLOTS = [
  { value: 'before-23:30', label: 'До 23:30' },
  { value: '23:30-00:30', label: '23:30–00:30' },
  { value: 'after-00:30', label: 'После 00:30' },
];

const SORT_OPTIONS = [
  { value: 'time', label: 'По времени' },
  { value: 'price', label: 'По цене' },
  { value: 'popular', label: 'По рейтингу' },
];

function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

  if (iso === today) return 'Сегодня';
  if (iso === tomorrow) return 'Завтра';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' });
}

function formatPrice(kopecks: number): string {
  return Math.round(kopecks / 100).toLocaleString('ru-RU') + ' ₽';
}

function shortenPier(pier: string): string {
  return pier
    .replace(/^(причал|наб\.|набережная)\s*/i, '')
    .replace(/\s*·\s*причал.*$/i, '')
    .slice(0, 25);
}

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-all ${
        active
          ? 'border-primary-300 bg-primary-50 text-primary-700 shadow-sm'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {label}
      {active && <X className="h-3 w-3 opacity-60" />}
    </button>
  );
}

export function FilterBar({ piers, priceRange, dates, onFilterChange }: FilterBarProps) {
  const [state, setState] = useState<FilterState>({
    date: '',
    timeSlot: '',
    pier: '',
    maxPrice: null,
    showSoldOut: false,
    sort: 'time',
  });

  const update = useCallback(
    (patch: Partial<FilterState>) => {
      const next = { ...state, ...patch };
      setState(next);
      onFilterChange(next);
    },
    [state, onFilterChange],
  );

  function reset() {
    const initial: FilterState = {
      date: '',
      timeSlot: '',
      pier: '',
      maxPrice: null,
      showSoldOut: false,
      sort: 'time',
    };
    setState(initial);
    onFilterChange(initial);
  }

  const hasFilters = state.date || state.timeSlot || state.pier || state.maxPrice;

  // Собираем «строку активных фильтров»
  const activeLabels: string[] = [];
  if (state.date) activeLabels.push(formatDateShort(state.date));
  const tsLabel = TIME_SLOTS.find((t) => t.value === state.timeSlot)?.label;
  if (tsLabel) activeLabels.push(tsLabel);
  if (state.pier) activeLabels.push(shortenPier(state.pier));
  if (state.maxPrice) activeLabels.push(`до ${formatPrice(state.maxPrice)}`);
  const sortLabel = SORT_OPTIONS.find((s) => s.value === state.sort)?.label;
  if (sortLabel && state.sort !== 'time') activeLabels.push(sortLabel);

  // Первые 5 дат как чипы
  const chipDates = dates.slice(0, 5);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 sticky top-0 z-20">
      {/* Ряд 1: Даты */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-400 sm:inline">Дата</span>
        {chipDates.map((d) => (
          <Chip
            key={d}
            label={formatDateShort(d)}
            active={state.date === d}
            onClick={() => update({ date: state.date === d ? '' : d })}
          />
        ))}
        {dates.length > 5 && (
          <select
            value={dates.slice(5).includes(state.date) ? state.date : ''}
            onChange={(e) => update({ date: e.target.value || '' })}
            className="h-8 rounded-full border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 focus:border-primary-400 focus:outline-none"
          >
            <option value="">Ещё…</option>
            {dates.slice(5).map((d) => (
              <option key={d} value={d}>
                {formatDateShort(d)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Ряд 2: Время, Причалы, Опции */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-400 sm:inline">Время</span>
        {TIME_SLOTS.map((ts) => (
          <Chip
            key={ts.value}
            label={ts.label}
            active={state.timeSlot === ts.value}
            onClick={() => update({ timeSlot: state.timeSlot === ts.value ? '' : ts.value })}
          />
        ))}

        {piers.length > 1 && (
          <>
            <div className="hidden h-5 w-px bg-slate-200 sm:block" />
            <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-400 sm:inline">
              Причал
            </span>
            {piers.map((p) => (
              <Chip
                key={p}
                label={shortenPier(p)}
                active={state.pier === p}
                onClick={() => update({ pier: state.pier === p ? '' : p })}
              />
            ))}
          </>
        )}
      </div>

      {/* Ряд 3: Цена, сорт, sold-out, сброс */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {priceRange[1] > 0 && (
          <>
            <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-400 sm:inline">
              Цена
            </span>
            {[100000, 200000, 300000, 500000]
              .filter((p) => p <= priceRange[1])
              .map((p) => (
                <Chip
                  key={p}
                  label={`до ${formatPrice(p)}`}
                  active={state.maxPrice === p}
                  onClick={() => update({ maxPrice: state.maxPrice === p ? null : p })}
                />
              ))}
          </>
        )}

        <div className="hidden h-5 w-px bg-slate-200 sm:block" />

        <select
          value={state.sort}
          onChange={(e) => update({ sort: e.target.value })}
          className="h-8 rounded-full border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 focus:border-primary-400 focus:outline-none"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <Chip
          label={state.showSoldOut ? 'Скрыть нет мест' : 'Показать нет мест'}
          active={state.showSoldOut}
          onClick={() => update({ showSoldOut: !state.showSoldOut })}
        />

        {hasFilters && (
          <button
            onClick={reset}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Сбросить
          </button>
        )}
      </div>

      {/* Строка активных фильтров */}
      {activeLabels.length > 0 && (
        <div className="mt-2 text-[13px] text-slate-400">
          Активно: {activeLabels.join(' · ')}
        </div>
      )}
    </div>
  );
}
