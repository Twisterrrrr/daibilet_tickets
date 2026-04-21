'use client';

import Link from 'next/link';

import { calendarDayFromIso, type EventListItem, getCityTimezone } from '@daibilet/shared';
import { Eye, Lightbulb, MapPin, Shield, Star } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FilterBar, type FilterState } from '@/components/landing/FilterBar';
import {
  DEFAULT_SALUTE_FACETS,
  matchesSaluteToolbarFacets,
} from '@/lib/salute-service-amenities';
import type { CatalogEventsUrlParams } from '@/lib/catalog-events-url';
import { FaqSection } from '@/components/landing/FaqSection';
import { HowToChoose, InfoBlocks, ReviewsSection } from '@/components/landing/ContentSections';
import { pluralExcursionsRu } from '@/components/landing/SaluteLandingHero';
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

function matchesSaluteTransport(e: EventListItem, transport: string | undefined): boolean {
  if (!transport || transport === 'any') return true;
  const blob = `${e.title} ${e.primarySubcategory?.nameRu ?? ''} ${e.primarySubcategory?.code ?? ''}`.toLowerCase();
  switch (transport) {
    case 'river':
      return /теплоход|речн|нева|водн|круиз|канал|прогул|паром|яхт|судно|борта?|палуб/i.test(blob);
    case 'bus':
      return /автобус/i.test(blob);
    case 'auto':
      return (
        /(минивэн|джип|vip|легков)/i.test(blob) ||
        (/авто/i.test(blob) && !/автобус/i.test(blob))
      );
    case 'moto':
      return /мото|байк/i.test(blob);
    default:
      return true;
  }
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

  const [filters, setFilters] = useState<FilterState>({
    date: '',
    timeSlot: '',
    pier: '',
    maxPrice: null,
    showSoldOut: false,
    sort: 'price',
    transport: 'any',
    facets: { ...DEFAULT_SALUTE_FACETS },
  });

  const filtered = useMemo(() => {
    let out = events;
    if (filters.pier) out = out.filter((e) => (e.address || '').includes(filters.pier));
    out = out.filter((e) => matchesSaluteTransport(e, filters.transport));
    out = out.filter((e) => matchesSaluteToolbarFacets(e, filters.facets));
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

  const withSession = useMemo(() => filtered.filter((e) => e.nextSessionAt), [filtered]);

  const reviewItems = content.reviews?.length ? content.reviews : ENHANCER_FALLBACK_REVIEWS;

  return (
    <div className="space-y-8">
      {(content.introText ||
        content.relatedLinks?.length ||
        content.viewpoints?.length ||
        content.tips?.length) && (
        <section className="space-y-8">
          {content.introText ? (
            <p className="max-w-3xl text-lg leading-relaxed text-slate-600">{content.introText}</p>
          ) : null}

          {content.relatedLinks?.length ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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

          {content.viewpoints?.length || content.tips?.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              {content.viewpoints?.length ? (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Eye className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
                    Лучшие точки обзора
                  </div>
                  <ul className="space-y-3">
                    {content.viewpoints.map((v) => (
                      <li key={v.name} className="flex items-start gap-3">
                        <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-900">{v.name}</span>
                            <span
                              className={
                                v.isFree
                                  ? 'rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-700'
                                  : 'rounded-md bg-primary-600/10 px-1.5 py-0.5 text-xs font-medium text-primary-700'
                              }
                            >
                              {v.isFree ? 'Бесплатно' : 'Билет'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-slate-600">{v.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {content.tips?.length ? (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Lightbulb className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
                    Советы
                  </div>
                  <ul className="space-y-3">
                    {content.tips.map((t, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-600/10 text-xs font-bold text-primary-700">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-600">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      )}

      <section id="variants" className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-x-6">
          <h2 className="min-w-0 text-2xl font-bold leading-tight text-slate-900 md:text-3xl">
            Расписание экскурсий{city ? ` — ${city.name}` : ''}
          </h2>
          {city ? (
            <Link
              href="/salute-9-may"
              className="shrink-0 justify-self-end text-sm font-semibold text-primary-700 hover:text-primary-800 sm:pt-0.5"
            >
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
          toolbarLayout
          saluteCitySlug={city?.slug ?? null}
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
              ? pluralExcursionsRu(withSession.length)
              : 'Ничего не найдено по фильтрам'}
          </span>
          {bestIdx !== null ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700">
              <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
              Оптимальный выбор выделен
            </span>
          ) : null}
        </div>

        <div className="space-y-3">
          {withSession.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
              <p className="text-slate-800">Ничего не найдено по фильтрам</p>
              <p className="mt-2 text-sm text-slate-600">Попробуйте изменить фильтры</p>
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
            <div className="text-sm font-bold">Мало предложений в каталоге</div>
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

      {content.howToChoose?.length ? (
        <HowToChoose
          items={content.howToChoose}
          layout="steps"
          title="Как выбрать предложение на салют"
          subtitle={
            content.howToChoose.length === 4
              ? '4 простых шага к лучшему празднику'
              : 'Ориентиры при выборе формата'
          }
        />
      ) : null}
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
