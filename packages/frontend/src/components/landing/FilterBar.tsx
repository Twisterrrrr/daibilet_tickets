'use client';

import { DEFAULT_CALENDAR_TZ, getTodayISO, getTomorrowISO } from '@daibilet/shared';
import {
  ChevronDown,
  Headphones,
  Mic,
  Music,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import type { LandingTimeSlotMode } from '@/app/cities/_landingVm';
import {
  catalogEventsHref,
  landingFilterSortToCatalogSort,
  landingTimeSlotToCatalogTimeOfDay,
  type CatalogEventsUrlParams,
} from '@/lib/catalog-events-url';
import {
  DEFAULT_SALUTE_FACETS,
  type SaluteToolbarFacets,
  type SaluteToolbarFacetsKey,
} from '@/lib/salute-service-amenities';

export { DEFAULT_SALUTE_FACETS, type SaluteToolbarFacets, type SaluteToolbarFacetsKey };

export interface FilterState {
  date: string;
  timeSlot: string;
  pier: string;
  maxPrice: number | null;
  showSoldOut: boolean;
  sort: string;
  /** Тип меню (гастро-лендинг); пусто — любой */
  menuKind?: string;
  /** Формат круиза (гастро); пусто — любой */
  experienceFormat?: string;
  /** Транспорт на тулбаре салюта (`any` — без фильтра) */
  transport?: string;
  /** Фасеты услуг салютного тулбара (иконки, в паре с карточкой) */
  facets?: SaluteToolbarFacets;
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
  /** Макет тулбара Lovable: сортировка → дата|города|транспорт → иконки → цена */
  toolbarLayout?: boolean;
  /** Текущий город на странице салюта (для подсветки чипа) */
  saluteCitySlug?: string | null;
  /** Значения меню из API (гастро-таблица) */
  menuKinds?: string[];
  /** Значения формата из API */
  experienceFormats?: string[];
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

/** Закат / ночь для ужин-круизов (время города) */
const TIME_SLOTS_DINNER = [
  { value: 'sunset', label: 'Закат 18–21' },
  { value: 'night', label: 'Ночь от 21:00' },
];

const MENU_KIND_LABELS: Record<string, string> = {
  BREAKFAST: 'Завтрак',
  LUNCH: 'Ланч',
  DINNER: 'Обед',
  BRUNCH: 'Бранч',
  SUPPER: 'Ужин',
  BUFFET: 'Шведский стол',
  SNACKS: 'Закуски',
  TASTING: 'Дегустация',
  BAR: 'Бар / напитки',
  OTHER: 'Другое',
};

const EXPERIENCE_LABELS: Record<string, string> = {
  CLASSIC: 'Классический',
  ROMANTIC: 'Романтический',
  VIP: 'VIP',
  PANORAMIC: 'Панорамный',
};

function menuKindLabel(code: string): string {
  return MENU_KIND_LABELS[code] ?? code;
}

function experienceLabel(code: string): string {
  return EXPERIENCE_LABELS[code] ?? code;
}

const SORT_OPTIONS = [
  { value: 'time', label: 'По времени' },
  { value: 'price', label: 'По цене' },
  { value: 'popular', label: 'По рейтингу' },
];

/** Порядок табов как в референсе Lovable: цена → рейтинг → время */
const SORT_OPTIONS_PRICE_FIRST = [
  { value: 'price', label: 'По цене' },
  { value: 'popular', label: 'По рейтингу' },
  { value: 'time', label: 'По времени' },
] as const;

const SALUTE_TOOLBAR_CITIES: ReadonlyArray<{ slug: string; name: string }> = [
  { slug: 'moscow', name: 'Москва' },
  { slug: 'saint-petersburg', name: 'Санкт-Петербург' },
  { slug: 'kazan', name: 'Казань' },
  { slug: 'nizhny-novgorod', name: 'Нижний Новгород' },
];

const TOOLBAR_FACET_META: ReadonlyArray<{
  key: SaluteToolbarFacetsKey;
  Icon: LucideIcon;
  title: string;
}> = [
  { key: 'food', Icon: Utensils, title: 'Еда и напитки' },
  { key: 'music', Icon: Music, title: 'Музыка/DJ' },
  { key: 'guide', Icon: Mic, title: 'Экскурсовод' },
  { key: 'audioguide', Icon: Headphones, title: 'Аудиогид' },
  { key: 'deck', Icon: Sun, title: 'Открытая палуба' },
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
  /**
   * `fill` — как выбранный город в референсе Lovable: сплошная primary-кнопка.
   * `tint` — мягкая подсветка (даты, цена).
   */
  selectedStyle?: 'tint' | 'fill';
}

function Chip({ label, active, onClick, selectedStyle = 'tint' }: ChipProps) {
  const filled = Boolean(active && selectedStyle === 'fill');
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[2.25rem] items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all ${
        active
          ? filled
            ? 'border-primary-600 bg-primary-600 text-white shadow-sm hover:border-primary-700 hover:bg-primary-700'
            : 'border-primary-400 bg-primary-50 text-primary-800 shadow-sm ring-1 ring-primary-200/60'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {label}
      {active && !filled ? <X className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden /> : null}
    </button>
  );
}

/** Строка табов сортировки (как на Lovable: первая горизонтальная полоса) */
function SortTabsRow({
  activeSort,
  onSelect,
  options = SORT_OPTIONS,
  /** Линия под строкой табов (у тулбара границу задаёт родитель вместе с «Сбросить») */
  borderBottom = true,
}: {
  activeSort: string;
  onSelect: (value: string) => void;
  options?: ReadonlyArray<{ value: string; label: string }>;
  borderBottom?: boolean;
}) {
  return (
    <div
      className={`-mx-1 flex flex-wrap gap-1 ${borderBottom ? 'border-b border-slate-200' : ''}`}
      role="tablist"
      aria-label="Сортировка списка"
    >
      {options.map((s) => (
        <button
          key={s.value}
          type="button"
          role="tab"
          aria-selected={activeSort === s.value}
          onClick={() => onSelect(s.value)}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            activeSort === s.value
              ? 'text-primary-600'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[color:var(--color-foreground)]'
          }`}
        >
          {s.label}
          {activeSort === s.value ? (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary-600" aria-hidden />
          ) : null}
        </button>
      ))}
    </div>
  );
}

function FilterSection({
  title,
  hint,
  children,
  plain,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  /** Плоские секции с разделителем — для маркетинговых лендингов (салют), без «матрёшки» карточек */
  plain?: boolean;
}) {
  if (plain) {
    return (
      <div className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
        <div className="mb-2.5 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <span className="text-xs font-semibold text-slate-700">{title}</span>
          {hint ? (
            <span className="text-[11px] leading-snug text-slate-400 sm:max-w-[55%] sm:text-right">{hint}</span>
          ) : null}
        </div>
        {children}
      </div>
    );
  }
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
  toolbarLayout = false,
  saluteCitySlug = null,
  menuKinds = [],
  experienceFormats = [],
}: FilterBarProps) {
  const [state, setState] = useState<FilterState>(() => ({
    date: '',
    timeSlot: '',
    pier: '',
    maxPrice: null,
    showSoldOut: false,
    sort: toolbarLayout ? 'price' : 'time',
    menuKind: '',
    experienceFormat: '',
    transport: 'any',
    ...(toolbarLayout ? { facets: { ...DEFAULT_SALUTE_FACETS } } : {}),
  }));

  const timeSlots = useMemo(() => {
    if (timeSlotMode === 'hidden') return [];
    if (timeSlotMode === 'evening') return TIME_SLOTS_EVENING;
    if (timeSlotMode === 'dinner') return TIME_SLOTS_DINNER;
    return TIME_SLOTS_NIGHT;
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
      sort: toolbarLayout ? 'price' : 'time',
      menuKind: '',
      experienceFormat: '',
      transport: 'any',
      ...(toolbarLayout ? { facets: { ...DEFAULT_SALUTE_FACETS } } : {}),
    };
    setState(initial);
    onFilterChange(initial);
  }

  const facetsActive = Boolean(
    state.facets && Object.values(state.facets).some(Boolean),
  );

  const hasFilters = Boolean(
    state.date ||
      state.timeSlot ||
      state.pier ||
      state.maxPrice ||
      state.menuKind ||
      state.experienceFormat ||
      (state.transport && state.transport !== 'any') ||
      facetsActive,
  );

  const activeLabels: string[] = [];
  if (state.date) activeLabels.push(formatDateShort(state.date, ianaTimeZone));
  const tsLabel = timeSlots.find((t) => t.value === state.timeSlot)?.label;
  if (tsLabel) activeLabels.push(tsLabel);
  if (state.pier) activeLabels.push(shortenPier(state.pier));
  if (state.menuKind) activeLabels.push(menuKindLabel(state.menuKind));
  if (state.experienceFormat) activeLabels.push(experienceLabel(state.experienceFormat));
  if (state.maxPrice) activeLabels.push(`до ${formatPrice(state.maxPrice)}`);
  const sortOptionsLookup = toolbarLayout ? SORT_OPTIONS_PRICE_FIRST : SORT_OPTIONS;
  const defaultSort = toolbarLayout ? 'price' : 'time';
  const sortLabel = sortOptionsLookup.find((s) => s.value === state.sort)?.label;
  if (sortLabel && state.sort !== defaultSort) activeLabels.push(sortLabel);

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
      ? 'Дата, причал и цена — список обновляется сразу.'
      : timeSlotMode === 'evening'
        ? 'Сначала выберите дату, затем при желании уточните интервал отправления — строки таблицы соответствуют фильтрам.'
        : timeSlotMode === 'dinner'
          ? 'Дата, закат или ночной слот, при необходимости тип меню и формат — строки таблицы соответствуют фильтрам.'
          : 'Фильтры по дате и времени отправления совпадают с колонками таблицы ниже — так проще сравнивать операторов.');

  const dateMin = dates.length > 0 ? dates[0] : undefined;
  const dateMax = dates.length > 0 ? dates[dates.length - 1] : undefined;

  const landingCompact = timeSlotMode === 'hidden';

  const dateBlock = (
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
      {dates.length === 0 ? <p className="text-sm text-slate-400">Нет дат в расписании</p> : null}
    </div>
  );

  const pierBlock =
    piers.length > 1 ? (
      <div className="flex flex-wrap gap-2">
        {piers.map((p) => (
          <Chip
            key={p}
            label={shortenPier(p)}
            active={state.pier === p}
            selectedStyle={landingCompact ? 'fill' : 'tint'}
            onClick={() => update({ pier: state.pier === p ? '' : p })}
          />
        ))}
      </div>
    ) : null;

  const priceRow = (
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
  );

  /** Шаги «до N ₽» для селекта в тулбаре салюта (те же копейки, что и у чипов в других режимах) */
  const saluteToolbarPriceSteps =
    priceRange[1] > 0 ? [100000, 200000, 300000, 500000].filter((p) => p <= priceRange[1]) : [];

  return (
    <div
      className={
        landingCompact
          ? 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-4 lg:z-10'
          : 'rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-md shadow-slate-200/40 ring-1 ring-slate-100 sm:p-5 lg:sticky lg:top-4 lg:z-10'
      }
    >
      {toolbarLayout && landingCompact ? null : (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            {!landingCompact ? (
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
              </div>
            ) : null}
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-slate-500">{subtitle}</p>
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
      )}

      {toolbarLayout && landingCompact ? (
        <div className="space-y-0">
          {/* Строка 1: сортировка + города (без выбора даты — салют 9 мая) */}
          <div className="flex flex-col gap-3 border-b border-slate-200 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-4 sm:gap-y-2">
            <div className="min-w-0 sm:max-w-[min(100%,28rem)] sm:flex-1">
              <SortTabsRow
                activeSort={state.sort}
                onSelect={(v) => update({ sort: v })}
                options={[...SORT_OPTIONS_PRICE_FIRST]}
                borderBottom={false}
              />
            </div>
            <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end">
              <Link
                href="/salute-9-may"
                className="inline-flex min-h-[2.25rem] items-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Все города
              </Link>
              {SALUTE_TOOLBAR_CITIES.map((c) => {
                const active = saluteCitySlug === c.slug;
                return (
                  <Link
                    key={c.slug}
                    href={`/cities/${c.slug}/salute-9-may`}
                    className={`inline-flex min-h-[2.25rem] items-center rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                      active
                        ? 'border-primary-600 bg-primary-600 text-white shadow-sm hover:bg-primary-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {c.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Строка 2: иконки слева; селекты на всю оставшуюся ширину поровну; чип и сброс справа */}
          <div
            className="flex w-full min-w-0 flex-wrap items-center gap-3 py-3 sm:flex-nowrap"
            role="group"
            aria-label="Услуги, транспорт, причал, цена и распроданные"
          >
            <div className="flex shrink-0 items-center gap-2">
              {TOOLBAR_FACET_META.map(({ key, Icon, title }) => {
                const active = (state.facets ?? DEFAULT_SALUTE_FACETS)[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      const cur = state.facets ?? { ...DEFAULT_SALUTE_FACETS };
                      update({ facets: { ...cur, [key]: !cur[key] } });
                    }}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200 ${
                      active
                        ? 'border-primary-600 bg-primary-600 text-white shadow-sm hover:bg-primary-700'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    title={title}
                    aria-pressed={active}
                    aria-label={title}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </button>
                );
              })}
            </div>
            <div className="flex min-h-[2.25rem] min-w-0 flex-1 flex-wrap gap-3 sm:flex-nowrap">
              <div className="relative min-w-[min(100%,10rem)] flex-1 basis-[10rem]">
                <select
                  value={state.transport ?? 'any'}
                  onChange={(e) => update({ transport: e.target.value })}
                  className="min-h-[2.25rem] w-full min-w-0 appearance-none rounded-full border border-slate-200 bg-white py-2 pl-3.5 pr-9 text-[13px] font-semibold text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  aria-label="Тип транспорта"
                >
                  <option value="any">Любой транспорт</option>
                  <option value="river">Речной / теплоход</option>
                  <option value="bus">Автобус</option>
                  <option value="auto">Авто</option>
                  <option value="moto">Мото</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden
                />
              </div>
              {piers.length > 1 ? (
                <div className="relative min-w-[min(100%,10rem)] flex-1 basis-[10rem]">
                  <select
                    value={state.pier}
                    onChange={(e) => update({ pier: e.target.value })}
                    className="min-h-[2.25rem] w-full min-w-0 appearance-none rounded-full border border-slate-200 bg-white py-2 pl-3.5 pr-9 text-[13px] font-semibold text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    aria-label="Локация / причал"
                  >
                    <option value="">Все причалы</option>
                    {piers.map((p) => (
                      <option key={p} value={p}>
                        {shortenPier(p)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                    aria-hidden
                  />
                </div>
              ) : null}
              {saluteToolbarPriceSteps.length > 0 ? (
                <div className="relative min-w-[min(100%,10rem)] flex-1 basis-[10rem]">
                  <select
                    value={
                      state.maxPrice != null && saluteToolbarPriceSteps.includes(state.maxPrice)
                        ? String(state.maxPrice)
                        : ''
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      update({ maxPrice: v === '' ? null : Number(v) });
                    }}
                    className="min-h-[2.25rem] w-full min-w-0 appearance-none rounded-full border border-slate-200 bg-white py-2 pl-3.5 pr-9 text-[13px] font-semibold text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    aria-label="Максимальная цена билета"
                  >
                    <option value="">Любая цена</option>
                    {saluteToolbarPriceSteps.map((p) => (
                      <option key={p} value={String(p)}>
                        до {formatPrice(p)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                    aria-hidden
                  />
                </div>
              ) : null}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
              <Chip
                label={state.showSoldOut ? 'Скрыть «нет мест»' : 'Показать распроданные'}
                active={state.showSoldOut}
                onClick={() => update({ showSoldOut: !state.showSoldOut })}
              />
              {hasFilters ? (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Сбросить
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : landingCompact ? (
        <div className="space-y-0">
          <FilterSection plain title="Сортировка">
            <SortTabsRow activeSort={state.sort} onSelect={(v) => update({ sort: v })} />
          </FilterSection>
          <FilterSection
            plain
            title="Дата"
            hint={dates.length === 0 ? 'Когда появятся сеансы, здесь будут доступные дни' : undefined}
          >
            {dateBlock}
          </FilterSection>
          {piers.length > 1 ? (
            <FilterSection plain title="Причал отправления" hint="По адресу в карточке события">
              {pierBlock}
            </FilterSection>
          ) : null}
          <FilterSection plain title="Цена">
            {priceRow}
          </FilterSection>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <FilterSection
            title="Дата"
            hint={dates.length === 0 ? 'Когда появятся сеансы, здесь будут доступные дни' : undefined}
          >
            {dateBlock}
          </FilterSection>

          {menuKinds.length > 0 ? (
            <FilterSection title="Питание" hint="По данным организатора или редакции">
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="Любое"
                  active={!state.menuKind}
                  onClick={() => update({ menuKind: '' })}
                />
                {menuKinds.map((k) => (
                  <Chip
                    key={k}
                    label={menuKindLabel(k)}
                    active={state.menuKind === k}
                    onClick={() => update({ menuKind: state.menuKind === k ? '' : k })}
                  />
                ))}
              </div>
            </FilterSection>
          ) : null}

          <FilterSection
            title={timeSlotMode === 'dinner' ? 'Время суток' : 'Время отправления'}
            hint={
              timeSlotMode === 'dinner'
                ? 'Закат 18:00–21:00 и ночь от 21:00 — по часовому поясу города'
                : timeSlotMode === 'evening'
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

          {experienceFormats.length > 0 ? (
            <FilterSection title="Формат" hint="Настроение и планировка на борту">
              <div className="flex flex-wrap gap-2">
                <Chip
                  label="Любой"
                  active={!state.experienceFormat}
                  onClick={() => update({ experienceFormat: '' })}
                />
                {experienceFormats.map((k) => (
                  <Chip
                    key={k}
                    label={experienceLabel(k)}
                    active={state.experienceFormat === k}
                    onClick={() =>
                      update({ experienceFormat: state.experienceFormat === k ? '' : k })
                    }
                  />
                ))}
              </div>
            </FilterSection>
          ) : null}

          {piers.length > 1 ? (
            <FilterSection title="Причал отправления" hint="Совпадает с текстом в адресе события">
              {pierBlock}
            </FilterSection>
          ) : null}

          <FilterSection title="Цена и порядок">
            <div className="mb-3">
              <SortTabsRow activeSort={state.sort} onSelect={(v) => update({ sort: v })} />
            </div>
            {priceRow}
          </FilterSection>
        </div>
      )}

      {!landingCompact && activeLabels.length > 0 ? (
        <div className="mt-4 rounded-lg bg-slate-100/80 px-3 py-2 text-[13px] text-slate-600">
          <span className="font-semibold text-slate-700">Активно: </span>
          {activeLabels.join(' · ')}
        </div>
      ) : null}

      {!toolbarLayout && catalogHref ? (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <Link
            href={catalogHref}
            className="text-sm font-semibold text-primary-700 hover:text-primary-900 hover:underline"
          >
            Открыть в каталоге /events →
          </Link>
          {!landingCompact ? (
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              В ссылку подставляются город, параметры лендинга и выбранные дата, причал, лимит цены и сортировка (как на
              витрине каталога).
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
