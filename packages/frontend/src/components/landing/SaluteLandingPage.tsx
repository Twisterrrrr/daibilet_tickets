'use client';

import Link from 'next/link';

import { type EventListItem, moscowCalendarDayFromIso } from '@daibilet/shared';

import { FilterBar } from '@/components/landing/FilterBar';
import { FaqSection } from '@/components/landing/FaqSection';
import { HowToChoose, InfoBlocks, ReviewsSection } from '@/components/landing/ContentSections';
import { useMemo, useState } from 'react';

type CityLite = { id: string; slug: string; name: string } | null;

export type SaluteCityViewpoint = {
  name: string;
  description: string;
  isFree: boolean;
};

export type SaluteLandingContent = {
  seoTitle?: string;
  seoDescription?: string;
  /** Подзаголовок под H1 (из референса city-landing-enhancer) */
  heroSubtitle?: string;
  introText?: string;
  /** Точки обзора: бесплатные и платные */
  viewpoints?: SaluteCityViewpoint[];
  /** Короткие практические советы */
  tips?: string[];
  /** Перелинковка (например, ночные мосты в Петербурге) */
  relatedLinks?: Array<{ href: string; title: string; description?: string }>;
  howToChoose?: Array<{ title: string; text: string }>;
  infoBlocks?: Array<{ title: string; text: string }>;
  faq?: Array<{ question: string; answer: string }>;
  reviews?: Array<{ text: string; author: string; rating: number }>;
};

function formatPriceRub(kopecks: number | null | undefined): string {
  if (!kopecks || kopecks <= 0) return '—';
  return Math.round(kopecks / 100).toLocaleString('ru-RU') + ' ₽';
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  });
}

function guessFormat(e: EventListItem): string {
  const t = e.title.toLowerCase();
  if (t.includes('теплоход') || t.includes('круиз') || t.includes('яхт')) return 'теплоход';
  if (t.includes('крыша')) return 'крыша';
  if (t.includes('ресторан')) return 'ресторан';
  return 'прогулка';
}

function operatorLabel(e: EventListItem): string {
  // В списке событий оператор явно не всегда доступен; используем город/формат + fallback.
  const fmt = guessFormat(e);
  return fmt === 'теплоход' ? 'Оператор (теплоход)' : 'Организатор';
}

function SaluteTable({ items }: { items: EventListItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-10">
        <p className="text-lg font-semibold text-slate-700">Пока нет подходящих вариантов</p>
        <p className="mt-1 text-sm text-slate-500">
          Попробуйте выбрать другой город или вернитесь ближе к дате праздника.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Оператор</th>
            <th className="px-4 py-3">Формат</th>
            <th className="px-4 py-3">Время</th>
            <th className="px-4 py-3 text-right">Цена от</th>
            <th className="px-4 py-3 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3.5">
                <div className="font-bold text-slate-900">{operatorLabel(e)}</div>
                <div className="mt-0.5 text-[12px] text-slate-500">{e.title}</div>
              </td>
              <td className="px-4 py-3.5">
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-slate-700">
                  {guessFormat(e)}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <div className="font-semibold text-slate-900">{formatTime(e.nextSessionAt)}</div>
                <div className="mt-0.5 text-[12px] text-slate-500">{e.address || '—'}</div>
              </td>
              <td className="px-4 py-3.5 text-right">
                <div className="text-base font-black text-slate-900">{formatPriceRub(e.priceFrom)}</div>
                <div className="text-[11px] text-slate-400">за билет</div>
              </td>
              <td className="px-4 py-3.5 text-right">
                <Link
                  href={`/events/${e.slug}`}
                  className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-colors"
                >
                  Открыть
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SaluteLandingPage({
  city,
  content,
  events,
  filterOptions,
}: {
  city: CityLite;
  content: SaluteLandingContent;
  events: EventListItem[];
  filterOptions: { piers: string[]; priceRange: [number, number]; dates: string[] };
}) {
  const [filters, setFilters] = useState<{
    date: string;
    timeSlot: string;
    pier: string;
    maxPrice: number | null;
    showSoldOut: boolean;
    sort: string;
  }>({ date: '', timeSlot: '', pier: '', maxPrice: null, showSoldOut: false, sort: 'time' });

  const filtered = useMemo(() => {
    let out = events;
    if (filters.pier) out = out.filter((e) => (e.address || '').includes(filters.pier));
    if (filters.maxPrice) out = out.filter((e) => (e.priceFrom ?? 0) <= filters.maxPrice!);
    if (filters.date) {
      out = out.filter((e) => {
        const t = e.nextSessionAt;
        if (!t) return false;
        return moscowCalendarDayFromIso(t) === filters.date;
      });
    }
    if (filters.sort === 'price') {
      out = [...out].sort((a, b) => (a.priceFrom ?? Number.MAX_SAFE_INTEGER) - (b.priceFrom ?? Number.MAX_SAFE_INTEGER));
    } else if (filters.sort === 'popular') {
      out = [...out].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else {
      out = [...out].sort((a, b) => String(a.nextSessionAt ?? '').localeCompare(String(b.nextSessionAt ?? '')));
    }
    return out;
  }, [events, filters]);

  const h1 = city ? `Салют 9 мая в ${city.name} 2026 — где смотреть и лучшие варианты` : 'Салют 9 мая 2026 в России';
  const subtitle = city
    ? content.heroSubtitle ??
      'Подборка вариантов по городу: теплоходы, рестораны, крыши и обзорные точки. Сравните цены и время.'
    : 'Выберите город и сравните варианты: теплоходы, рестораны, крыши и обзорные точки.';

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <nav className="text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Главная
          </Link>
          <span className="px-2">/</span>
          <Link href="/salute-9-may" className="hover:text-slate-900 transition-colors">
            Салют 9 мая
          </Link>
          {city ? (
            <>
              <span className="px-2">/</span>
              <span className="text-slate-900 font-semibold">{city.name}</span>
            </>
          ) : null}
        </nav>

        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">{h1}</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">{subtitle}</p>

        {content.introText ? (
          <div className="prose prose-slate mt-4 max-w-none">
            <p>{content.introText}</p>
          </div>
        ) : null}

        {content.relatedLinks?.length ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {content.relatedLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-xl border border-primary-200 bg-primary-50/80 px-4 py-3 text-sm font-semibold text-primary-900 hover:bg-primary-100/90 transition-colors"
              >
                <span>{l.title}</span>
                {l.description ? <span className="mt-0.5 block text-xs font-normal text-primary-800/90">{l.description}</span> : null}
              </Link>
            ))}
          </div>
        ) : null}

        {content.viewpoints?.length ? (
          <div className="mt-6">
            <h2 className="text-lg font-bold text-slate-900">Где смотреть</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {content.viewpoints.map((v) => (
                <li
                  key={v.name}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{v.name}</span>
                    <span
                      className={
                        v.isFree
                          ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-800'
                          : 'rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-700'
                      }
                    >
                      {v.isFree ? 'Бесплатно' : 'Билет'}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-600">{v.description}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {content.tips?.length ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5">
            <h2 className="text-base font-bold text-slate-900">Советы</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {content.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xl font-bold text-slate-900">Варианты и цены</h2>
          {city ? (
            <Link href="/salute-9-may" className="text-sm font-semibold text-primary-700 hover:text-primary-800">
              Все города →
            </Link>
          ) : null}
        </div>

        <FilterBar
          piers={filterOptions.piers}
          priceRange={filterOptions.priceRange}
          dates={filterOptions.dates}
          timeSlotMode="hidden"
          onFilterChange={setFilters}
        />

        <SaluteTable items={filtered} />

        {filtered.length < 3 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-slate-800">
            <div className="text-sm font-bold">Мало вариантов в каталоге</div>
            <div className="mt-1 text-sm text-slate-700">
              Пока в каталоге меньше 3 предложений. Добавили универсальные советы: где смотреть бесплатно, как выбрать место
              и как не попасть в толпу.
            </div>
            <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>Приходите заранее: за 60–90 минут лучшие точки уже заняты.</li>
              <li>Одевайтесь теплее: вечером у воды ощутимо холоднее.</li>
              <li>Если важен комфорт — выбирайте теплоход/ресторан с обзором и входом по билетам.</li>
            </ul>
            <div className="mt-3 text-sm text-slate-600">Карта точек просмотра — заглушка (добавим позже).</div>
          </div>
        ) : null}
      </section>

      {content.howToChoose?.length ? <HowToChoose items={content.howToChoose} /> : null}
      {content.infoBlocks?.length ? <InfoBlocks items={content.infoBlocks} /> : null}
      {content.faq?.length ? <FaqSection items={content.faq} /> : null}
      {content.reviews?.length ? <ReviewsSection items={content.reviews} /> : null}
    </div>
  );
}

