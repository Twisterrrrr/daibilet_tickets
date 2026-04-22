'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

import type { CityListItem } from '@daibilet/shared';

export function CatalogAdvancedFilters({
  open,
  onClose,
  title = 'Все фильтры',
  activeCount,
  cities,
  city,
  onCity,
  priceMax,
  onPriceMax,
  timeOfDay,
  onTimeOfDay,
  pier,
  onPier,
  piers,
  themeTagSlug,
  onTheme,
  audienceTagSlug,
  onAudienceTag,
  formatTagSlug,
  onFormat,
  structuralTagOptions,
  popularTagOptions,
  popularTagSlugs,
  popularAddSlug,
  onPopularAdd,
  onPopularRemove,
  sort,
  onSort,
  sortOptions,
  clearAll,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  activeCount: number;
  cities: CityListItem[];
  city: string;
  onCity: (slug: string) => void;
  priceMax: string;
  onPriceMax: (v: string) => void;
  timeOfDay: string;
  onTimeOfDay: (v: string) => void;
  pier: string;
  onPier: (v: string) => void;
  piers: { id: string; title: string; shortTitle?: string | null }[];
  themeTagSlug: string;
  onTheme: (v: string) => void;
  audienceTagSlug: string;
  onAudienceTag: (v: string) => void;
  formatTagSlug: string;
  onFormat: (v: string) => void;
  structuralTagOptions: {
    THEME: { id: string; slug: string; name: string; sortOrder?: number | null }[];
    AUDIENCE: { id: string; slug: string; name: string; sortOrder?: number | null }[];
    FORMAT: { id: string; slug: string; name: string; sortOrder?: number | null }[];
  };
  popularTagOptions: { id: string; slug: string; name: string; sortOrder?: number | null }[];
  popularTagSlugs: string[];
  popularAddSlug: string;
  onPopularAdd: (slug: string) => void;
  onPopularRemove: (slug: string) => void;
  sort: string;
  onSort: (v: string) => void;
  sortOptions: { value: string; label: string }[];
  clearAll: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Закрыть фильтры"
      />

      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-3xl border-t border-slate-200 bg-white p-4 shadow-2xl sm:inset-x-1/2 sm:bottom-auto sm:top-20 sm:max-h-[80vh] sm:w-[min(720px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-3xl sm:border sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-slate-900">{title}</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {activeCount > 0 ? `Активно фильтров: ${activeCount}` : 'Можно уточнить выдачу редкими параметрами'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Сбросить
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Город">
            <select
              value={city}
              onChange={(e) => onCity(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Все города</option>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Цена">
            <select
              value={priceMax}
              onChange={(e) => onPriceMax(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Любая цена</option>
              <option value="500">До 500 ₽</option>
              <option value="1000">До 1 000 ₽</option>
              <option value="1500">До 1 500 ₽</option>
              <option value="2000">До 2 000 ₽</option>
              <option value="5000">До 5 000 ₽</option>
            </select>
          </Field>

          <Field label="Время">
            <select
              value={timeOfDay}
              onChange={(e) => onTimeOfDay(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Любое время</option>
              <option value="morning">🌅 Утро</option>
              <option value="day">☀️ День</option>
              <option value="evening">🌆 Вечер</option>
              <option value="night">🌙 Ночь</option>
            </select>
          </Field>

          {piers.length > 0 ? (
            <Field label="Причал">
              <select
                value={pier}
                onChange={(e) => onPier(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="">Все причалы</option>
                {piers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.shortTitle || p.title}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field label="Сортировка">
            <select
              value={sort}
              onChange={(e) => onSort(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Тема">
            <select
              value={themeTagSlug}
              onChange={(e) => onTheme(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Любая</option>
              {[...(structuralTagOptions.THEME ?? [])]
                .slice()
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
                .map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Аудитория">
            <select
              value={audienceTagSlug}
              onChange={(e) => onAudienceTag(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Любая</option>
              {[...(structuralTagOptions.AUDIENCE ?? [])]
                .slice()
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
                .map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Формат">
            <select
              value={formatTagSlug}
              onChange={(e) => onFormat(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Любой</option>
              {[...(structuralTagOptions.FORMAT ?? [])]
                .slice()
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
                .map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Popular теги (добавить)">
            <select
              value={popularAddSlug}
              onChange={(e) => onPopularAdd(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="">+ popular</option>
              {popularTagOptions
                .slice()
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
                .map((t) => (
                  <option key={t.id} value={t.slug} disabled={popularTagSlugs.includes(t.slug)}>
                    {t.name}
                  </option>
                ))}
            </select>
          </Field>

          {popularTagSlugs.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {popularTagSlugs.map((slug) => {
                const label = popularTagOptions.find((t) => t.slug === slug)?.name ?? slug;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => onPopularRemove(slug)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                    aria-label={`Удалить popular тег ${label}`}
                  >
                    {label}
                    <X className="h-3.5 w-3.5 opacity-60" aria-hidden />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={clearAll}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Сбросить всё
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            Показать результаты
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">{label}</div>
      {children}
    </label>
  );
}

