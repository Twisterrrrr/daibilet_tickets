'use client';

import { DEFAULT_CALENDAR_TZ, getTodayISO, getTomorrowISO } from '@daibilet/shared';
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import type { LandingTimeSlotMode } from '@/app/cities/_landingVm';
import {
  catalogEventsHref,
  landingFilterSortToCatalogSort,
  landingTimeSlotToCatalogTimeOfDay,
  type CatalogEventsUrlParams,
} from '@/lib/catalog-events-url';

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
  /** IANA timezone для «сегодня»/«завтра» и подписей дат (как DateFilter timezone в city-landing-enhancer) */
  ianaTimeZone?: string;
  /** Ночные мосты / вечерние круизы / скрыть чипы времени */
  timeSlotMode?: LandingTimeSlotMode;
  onFilterChange: (filters: FilterState) => void;
  /** Заголовок блока (мультилендинги vs только ночные рейсы) */
  filterTitle?: string;
  /** Подзаголовок под заголовком */
  filterSubtitle?: string;
  /** Перелинковка в общий каталог: город + базовые параметры лендинга (тег, категория из CMS). */
  catalogEventsContext?: {
    citySlug: string;
    baseParams?: CatalogEventsUrlParams;
  };
}

const TIME_SLOTS_NIGHT = [
  { value: 'before-23:30', label: 'До 23:30' },
  { value: '23:30-00:30', label: '23:30–00:30' },
  { value: 'after-00:30', label: 'После 00:30' },
];

const TIME_SLOTS_EVENING = [
  { value: 'ev-17-19', label: '17:00–19:00' },
  { value: 'ev-19-21', label: '19:00–21:00' },
  { value: 'ev-21-plus', label: 'От 21:00' },
];

const SORT_OPTIONS = [
  { value: 'time', label: 'По времени' },
  { value: 'price', label: 'По цене' },
  { value: 'popular', label: 'По рейтингу' },
];

/** iso — YYYY-MM-DD календарного дня в часовом поясе города */
function formatDateShort(iso: string, tz: string): string {
  const today = getTodayISO(tz);
  const tomorrow = getTomorrowISO(tz);
  if (iso === today) return 'Сегодня';
  if (iso === tomorrow) return 'Завтра';
  const [y, mo, da] = iso.split('-').map(Number);
  if (!y || !mo || !da) return iso;
  const d = new Date(Date.UTC(y, mo - 1, da, 12, 0, 0));
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    timeZone: tz,
  });
}

function formatPrice(kopecks: number): string {
  return Math.round(kopecks / 100).toLocaleString('ru-RU') + ' ₽';
}

function shortenPier(pier: string): string {
  return pier
    .replace(/^(причал|наб\.|набережная)\s*/i, '')
    .replace(/\s*·\s*причал.*$/i, '')
    .slice(0, 28);
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
      className={`inline-flex min-h-[2.25rem] items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all ${
        active
          ? 'border-primary-400 bg-primary-50 text-primary-800 shadow-sm ring-1 ring-primary-200/60'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {label}
      {active && <X className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />}
    </button>
  );
}

function FilterSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-2.5 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">{title}</span>
        {hint ? <span className="text-[11px] leading-snug text-slate-400 sm:text-right sm:max-w-[55%]">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function FilterBar({
  piers,
  priceRange,
  dates,
  ianaTimeZone = DEFAULT_CALENDAR_TZ,
  timeSlotMode = 'night',
  onFilterChange,
  filterTitle,
  filterSubtitle,
  catalogEventsContext,
}: FilterBarProps) {
  const [state, setState] = useState<FilterState>({
    date: '',
    timeSlot: '',
    pier: '',
    maxPrice: null,
    showSoldOut: false,
    sort: 'time',
  });

  const timeSlots = useMemo(() => {
    if (timeSlotMode === 'hidden') return [];
    return timeSlotMode === 'evening' ? TIME_SLOTS_EVENING : TIME_SLOTS_NIGHT;
  }, [timeSlotMode]);

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

  const hasFilters = Boolean(state.date || state.timeSlot || state.pier || state.maxPrice);

  const activeLabels: string[] = [];
  if (state.date) activeLabels.push(formatDateShort(state.date, ianaTimeZone));
  const tsLabel = timeSlots.find((t) => t.value === state.timeSlot)?.label;
  if (tsLabel) activeLabels.push(tsLabel);
  if (state.pier) activeLabels.push(shortenPier(state.pier));
  if (state.maxPrice) activeLabels.push(`до ${formatPrice(state.maxPrice)}`);
  const sortLabel = SORT_OPTIONS.find((s) => s.value === state.sort)?.label;
  if (sortLabel && state.sort !== 'time') activeLabels.push(sortLabel);

  const chipDates = dates.slice(0, 5);

  const catalogHref = useMemo(() => {
    if (!catalogEventsContext) return null;
    const citySlug = catalogEventsContext.citySlug?.trim();
    if (!citySlug) return null;
    const timeOfDay = landingTimeSlotToCatalogTimeOfDay(timeSlotMode, state.timeSlot);
    const rubMax =
      state.maxPrice != null && state.maxPrice > 0
        ? String(Math.max(1, Math.round(state.maxPrice / 100)))
        : null;
    return catalogEventsHref({
      ...(catalogEventsContext.baseParams ?? {}),
      city: citySlug,
      date: state.date || null,
      pier: state.pier || null,
      priceMax: rubMax,
      sort: landingFilterSortToCatalogSort(state.sort),
      ...(timeOfDay ? { timeOfDay } : {}),
    });
  }, [catalogEventsContext, state, timeSlotMode]);

  const title =
    filterTitle ??
    (timeSlotMode === 'hidden' ? 'Подберите вариант' : 'Подберите рейс');
  const subtitle =
    filterSubtitle ??
    (timeSlotMode === 'hidden'
      ? 'Выберите день с сеансами, при необходимости сузьте по причалу и цене — список ниже обновится так же, как на лендинге ночных мостов.'
      : timeSlotMode === 'evening'
        ? 'Сначала выберите дату, затем при желании уточните интервал отправления — строки таблицы соответствуют фильтрам.'
        : 'Фильтры по дате и времени отправления совпадают с колонками таблицы ниже — так проще сравнивать операторов.');

  const dateMin = dates.length > 0 ? dates[0] : undefined;
  const dateMax = dates.length > 0 ? dates[dates.length - 1] : undefined;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-md shadow-slate-200/40 ring-1 ring-slate-100 sm:p-5 lg:sticky lg:top-4 lg:z-10">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-slate-500">{subtitle}</p>
          </div>
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Сбросить всё
          </button>
        ) : null}
      </div>

      <div className="space-y-3 sm:space-y-4">
        <FilterSection
          title="Дата"
          hint={dates.length === 0 ? 'Когда появятся сеансы, здесь будут доступные дни' : undefined}
        >
          <div className="flex flex-wrap gap-2">
            {chipDates.map((d) => (
              <Chip
                key={d}
                label={formatDateShort(d, ianaTimeZone)}
                active={state.date === d}
                onClick={() => update({ date: state.date === d ? '' : d })}
              />
            ))}
            {dates.length > 5 ? (
              <select
                value={dates.slice(5).includes(state.date) ? state.date : ''}
                onChange={(e) => update({ date: e.target.value || '' })}
                className="min-h-[2.25rem] rounded-full border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="">Другая дата…</option>
                {dates.slice(5).map((d) => (
                  <option key={d} value={d}>
                    {formatDateShort(d, ianaTimeZone)}
                  </option>
                ))}
              </select>
            ) : null}
            {dates.length > 0 && dateMin && dateMax ? (
              <label className="flex min-h-[2.25rem] max-w-full flex-1 items-center gap-2 rounded-full border border-dashed border-slate-200 bg-white px-3.5 py-1.5 text-[13px] text-slate-600 sm:flex-initial">
                <span className="shrink-0 font-semibold text-slate-500">Календарь</span>
                <input
                  type="date"
                  className="min-w-0 flex-1 rounded-md border-0 bg-transparent py-1 text-[13px] font-semibold text-slate-800 focus:outline-none focus:ring-0"
                  min={dateMin}
                  max={dateMax}
                  value={dates.includes(state.date) ? state.date : ''}
                  onChange={(e) => update({ date: e.target.value || '' })}
                  aria-label="Выбор даты"
                />
              </label>
            ) : null}
            {dates.length === 0 ? (
              <p className="text-sm text-slate-400">Нет дат в расписании</p>
            ) : null}
          </div>
        </FilterSection>

        {timeSlotMode !== 'hidden' ? (
          <FilterSection
            title="Время отправления"
            hint={
              timeSlotMode === 'evening'
                ? 'Для вечерних и ужин-круизов по Москве-реке'
                : 'Интервалы под развод мостов в Петербурге'
            }
          >
            <div className="flex flex-wrap gap-2">
              {timeSlots.map((ts) => (
                <Chip
                  key={ts.value}
                  label={ts.label}
                  active={state.timeSlot === ts.value}
                  onClick={() => update({ timeSlot: state.timeSlot === ts.value ? '' : ts.value })}
                />
              ))}
            </div>
          </FilterSection>
        ) : null}

        {piers.length > 1 ? (
          <FilterSection title="Причал отправления" hint="Совпадает с текстом в адресе события">
            <div className="flex flex-wrap gap-2">
              {piers.map((p) => (
                <Chip
                  key={p}
                  label={shortenPier(p)}
                  active={state.pier === p}
                  onClick={() => update({ pier: state.pier === p ? '' : p })}
                />
              ))}
            </div>
          </FilterSection>
        ) : null}

        <FilterSection title="Цена и порядок">
          {/* Табы как в Lovable/shadcn: muted-foreground / primary, underline на всю ширину кнопки (светлый лендинг) */}
          <div
            className="-mx-1 mb-3 flex flex-wrap gap-1 border-b border-slate-200"
            role="tablist"
            aria-label="Сортировка списка"
          >
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                role="tab"
                aria-selected={state.sort === s.value}
                onClick={() => update({ sort: s.value })}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                  state.sort === s.value
                    ? 'text-primary-600'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[color:var(--color-foreground)]'
                }`}
              >
                {s.label}
                {state.sort === s.value ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary-600" aria-hidden />
                ) : null}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {priceRange[1] > 0 ? (
              <>
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
            ) : null}

            <Chip
              label={state.showSoldOut ? 'Скрыть «нет мест»' : 'Показать распроданные'}
              active={state.showSoldOut}
              onClick={() => update({ showSoldOut: !state.showSoldOut })}
            />
          </div>
        </FilterSection>
      </div>

      {activeLabels.length > 0 ? (
        <div className="mt-4 rounded-lg bg-slate-100/80 px-3 py-2 text-[13px] text-slate-600">
          <span className="font-semibold text-slate-700">Активно: </span>
          {activeLabels.join(' · ')}
        </div>
      ) : null}

      {catalogHref ? (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <Link
            href={catalogHref}
            className="text-sm font-semibold text-primary-700 hover:text-primary-900 hover:underline"
          >
            Открыть в каталоге /events →
          </Link>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            В ссылку подставляются город, параметры лендинга и выбранные дата, причал, лимит цены и сортировка (как на
            витрине каталога).
          </p>
        </div>
      ) : null}
    </div>
  );
}
