'use client';

import Link from 'next/link';

import { calendarDayFromIso, type EventListItem, getCityTimezone } from '@daibilet/shared';
import { Shield, Star, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FilterBar } from '@/components/landing/FilterBar';
import type { CatalogEventsUrlParams } from '@/lib/catalog-events-url';
import { FaqSection } from '@/components/landing/FaqSection';
import { HowToChoose, InfoBlocks, ReviewsSection } from '@/components/landing/ContentSections';
import { SaluteTripCard } from '@/components/landing/SaluteTripCard';

type CityLite = { id: string; slug: string; name: string } | null;

export type SaluteCityViewpoint = {
  name: string;
  description: string;
  isFree: boolean;
};

export type SaluteLandingContent = {
  seoTitle?: string;
  seoDescription?: string;
  /** H1 как в city-landing-enhancer (heroTitle) */
  heroTitle?: string;
  /** Подзаголовок под H1 */
  heroSubtitle?: string;
  introText?: string;
  viewpoints?: SaluteCityViewpoint[];
  tips?: string[];
  relatedLinks?: Array<{ href: string; title: string; description?: string }>;
  howToChoose?: Array<{ title: string; text: string }>;
  infoBlocks?: Array<{ title: string; text: string }>;
  faq?: Array<{ question: string; answer: string }>;
  reviews?: Array<{ text: string; author: string; rating: number }>;
};

/** Отзывы из макета Lovable / Salute.tsx — если в контенте города не заданы свои */
const ENHANCER_FALLBACK_REVIEWS: Array<{ text: string; author: string; rating: number }> = [
  {
    text: 'Смотрели салют с теплохода — это невероятно! Фейерверк отражается в воде, 360° обзор. Лучший День Победы!',
    author: 'Наталья М.',
    rating: 5,
  },
  {
    text: 'Автобусный тур — отличная идея: сначала экскурсия по памятным местам, потом салют. Познавательно и красиво.',
    author: 'Алексей Р.',
    rating: 5,
  },
  {
    text: 'Мото-парад — незабываемые эмоции! Колонна байкеров, музыка, а в финале — салют. Рекомендую всем!',
    author: 'Сергей К.',
    rating: 5,
  },
  {
    text: 'Брали VIP-авто на двоих. Водитель знал лучшие точки. Салют смотрели с Воробьёвых гор — магия.',
    author: 'Ольга Д.',
    rating: 5,
  },
  {
    text: 'Были с детьми на речной прогулке в Казани. Дети в восторге от салюта. Удобно, тепло, вкусно!',
    author: 'Ирина В.',
    rating: 4,
  },
  {
    text: 'Третий год подряд на салюте с воды. Каждый раз как первый — рекомендую всем!',
    author: 'Максим Л.',
    rating: 5,
  },
];

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
      {icon}
      {label}
    </div>
  );
}

function pickOptimalSaluteIndex(events: EventListItem[]): number | null {
  const available = events.filter((e) => (e.totalAvailableTickets ?? 0) > 0 && e.nextSessionAt);
  if (available.length === 0) return null;
  const prices = available.map((e) => e.priceFrom ?? 0).filter((p) => p > 0);
  if (prices.length === 0) return null;
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  let bestIdx = -1;
  let bestScore = -1;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if ((e.totalAvailableTickets ?? 0) <= 0 || !e.nextSessionAt) continue;
    const p = e.priceFrom ?? 0;
    if (p <= 0) continue;
    const priceScore = maxP === minP ? 1 : 1 - (p - minP) / (maxP - minP);
    const ratingScore = (Number(e.rating) || 0) / 5;
    const seatScore = Math.min((e.totalAvailableTickets ?? 0) / 20, 1);
    const score = 0.4 * priceScore + 0.4 * ratingScore + 0.2 * seatScore;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx >= 0 ? bestIdx : null;
}

export function SaluteLandingPage({
  city,
  content,
  events,
  filterOptions,
  catalogEventsBaseParams,
}: {
  city: CityLite;
  content: SaluteLandingContent;
  events: EventListItem[];
  filterOptions: { piers: string[]; priceRange: [number, number]; dates: string[] };
  catalogEventsBaseParams?: CatalogEventsUrlParams;
}) {
  const ianaTimeZone = useMemo(() => getCityTimezone(city?.slug ?? null), [city?.slug]);

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
        return calendarDayFromIso(t, ianaTimeZone) === filters.date;
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
  }, [events, filters, ianaTimeZone]);

  const bestIdx = useMemo(() => pickOptimalSaluteIndex(filtered), [filtered]);

  const h1Fallback = city ? `Салют 9 мая в ${city.name} 2026 — где смотреть и лучшие варианты` : 'Салют 9 мая 2026 в России';
  const h1 = content.heroTitle ?? h1Fallback;
  const subtitle = city
    ? content.heroSubtitle ??
      'Подборка вариантов по городу: теплоходы, рестораны, крыши и обзорные точки. Сравните цены и время.'
    : 'Выберите город и сравните варианты: теплоходы, рестораны, крыши и обзорные точки.';

  const withSession = useMemo(() => filtered.filter((e) => e.nextSessionAt), [filtered]);

  const avgRating = useMemo(() => {
    const rated = events.filter((e) => Number(e.rating) > 0);
    if (rated.length === 0) return 4.7;
    const sum = rated.reduce((s, e) => s + Number(e.rating), 0);
    return Math.round((sum / rated.length) * 10) / 10;
  }, [events]);

  const reviewItems = content.reviews?.length ? content.reviews : ENHANCER_FALLBACK_REVIEWS;

  const excursionWord = (n: number) => {
    if (n === 1) return 'экскурсия';
    if (n >= 2 && n <= 4) return 'экскурсии';
    return 'экскурсий';
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl sm:rounded-3xl gradient-hero-lovable text-white shadow-lg">
        <div className="px-5 py-12 sm:px-8 sm:py-16 md:py-20">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-white/75">
            <Link href="/" className="transition-colors hover:text-white">
              Главная
            </Link>
            <span>/</span>
            <Link href="/salute-9-may" className="transition-colors hover:text-white">
              Салют 9 мая
            </Link>
            {city ? (
              <>
                <span>/</span>
                <span className="text-white">{city.name}</span>
              </>
            ) : null}
          </nav>

          <h1 className="mt-5 max-w-4xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl lg:text-5xl">
            {h1}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/85 md:text-lg">{subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <StatChip icon={<TrendingUp className="h-4 w-4" />} label={`${events.length} ${excursionWord(events.length)}`} />
            <StatChip icon={<Shield className="h-4 w-4" />} label="8 340+ продано" />
            <StatChip icon={<Star className="h-4 w-4" />} label={`${avgRating} / 5`} />
          </div>
        </div>
      </section>

      {(content.introText ||
        content.relatedLinks?.length ||
        content.viewpoints?.length ||
        content.tips?.length) && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {content.introText ? (
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700">{content.introText}</p>
            </div>
          ) : null}

          {content.relatedLinks?.length ? (
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {content.relatedLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-xl border border-primary-200 bg-primary-50/80 px-4 py-3 text-sm font-semibold text-primary-900 transition-colors hover:bg-primary-100/90"
                >
                  <span>{l.title}</span>
                  {l.description ? (
                    <span className="mt-0.5 block text-xs font-normal text-primary-800/90">{l.description}</span>
                  ) : null}
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
      )}

      <section id="variants" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Расписание экскурсий{city ? ` — ${city.name}` : ''}
          </h2>
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
          ianaTimeZone={ianaTimeZone}
          timeSlotMode="hidden"
          onFilterChange={setFilters}
          catalogEventsContext={
            city?.slug
              ? { citySlug: city.slug, baseParams: catalogEventsBaseParams }
              : undefined
          }
        />

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-600">
            {withSession.length > 0
              ? `${withSession.length} ${excursionWord(withSession.length)}`
              : 'Нет экскурсий по выбранным фильтрам'}
          </span>
          {bestIdx !== null ? (
            <span className="text-xs font-medium text-primary-700">Оптимальный выбор выделен</span>
          ) : null}
        </div>

        <div className="space-y-3">
          {withSession.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
              <p className="text-slate-600">Попробуйте изменить фильтры</p>
            </div>
          ) : (
            withSession.map((e, i) => {
              const idxInFiltered = filtered.indexOf(e);
              return (
                <SaluteTripCard
                  key={e.id}
                  event={e}
                  isBest={idxInFiltered === bestIdx}
                  index={i}
                  timeZone={ianaTimeZone}
                  nextSessionAt={e.nextSessionAt!}
                />
              );
            })
          )}
        </div>

        {filtered.filter((e) => (e.totalAvailableTickets ?? 0) > 0).length < 3 && city ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-slate-800">
            <div className="text-sm font-bold">Мало вариантов в каталоге</div>
            <div className="mt-1 text-sm text-slate-700">
              Пока в каталоге мало предложений. Ниже — универсальные советы и точки с бесплатным обзором из гида по городу.
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>Приходите заранее: за 60–90 минут лучшие места уже заняты.</li>
              <li>Одевайтесь теплее: вечером у воды ощутимо холоднее.</li>
              <li>Если важен комфорт — выбирайте формат с билетом и зарезервированным местом.</li>
            </ul>
          </div>
        ) : null}
      </section>

      {content.howToChoose?.length ? <HowToChoose items={content.howToChoose} /> : null}
      {content.infoBlocks?.length ? <InfoBlocks items={content.infoBlocks} /> : null}
      {content.faq?.length ? <FaqSection items={content.faq} /> : null}
      <ReviewsSection items={reviewItems} />

      <div className="py-8 text-center">
        <div className="mx-auto flex max-w-2xl items-start justify-center gap-2 text-sm text-slate-600">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <span>Покупка оформляется через билетную систему организатора. Мы помогаем сравнить предложения.</span>
        </div>
      </div>
    </div>
  );
}
