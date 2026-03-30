import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { type CityListItem, type EventListItem, moscowCalendarDayFromIso } from '@daibilet/shared';

import { SaluteLandingPage } from '@/components/landing/SaluteLandingPage';
import { api } from '@/lib/api';

import { SALUTE_TAG, saluteContentForCity } from '../salute-content';

export const revalidate = 21600;

type Props = { params: Promise<{ citySlug: string }> };

function buildFilterOptions(events: EventListItem[]) {
  const piers = [
    ...new Set(
      events
        .map((e) => e.address)
        .filter((a): a is string => typeof a === 'string' && Boolean(a.trim())),
    ),
  ];
  const prices = events.map((e) => e.priceFrom).filter((p): p is number => typeof p === 'number' && p > 0);
  const priceRange: [number, number] = prices.length ? [Math.min(...prices), Math.max(...prices)] : [0, 0];
  const dates = [
    ...new Set(
      events
        .map((e) => e.nextSessionAt)
        .filter((d): d is string => typeof d === 'string' && d.length >= 10)
        .map((d) => moscowCalendarDayFromIso(d)),
    ),
  ].sort();
  return { piers, priceRange, dates };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { citySlug } = await params;
  const cities = await api.getCities().catch(() => []);
  const city = cities.find((c) => c.slug === citySlug) ?? null;
  const content = saluteContentForCity(citySlug);

  const title = content.seoTitle || (city ? `Салют 9 мая в ${city.name} 2026 — где смотреть | Дайбилет` : 'Салют 9 мая 2026');
  const description =
    content.seoDescription ||
    (city ? `Салют 9 мая в ${city.name}: варианты с билетами и советы, где смотреть.` : 'Салют 9 мая по городам России.');

  return {
    title,
    description,
    alternates: { canonical: city ? `/salute-9-may/${city.slug}` : '/salute-9-may' },
  };
}

export default async function Salute9MayCityPage({ params }: Props) {
  const { citySlug } = await params;
  const cities: CityListItem[] = await api.getCities().catch(() => []);
  const city = cities.find((c) => c.slug === citySlug) ?? null;
  if (!city) notFound();

  // Канонический фильтр — cityId. Расширение API: EventsQueryDto.cityId (не ломает city=slug).
  const eventsRes = await api.getEvents({ tag: SALUTE_TAG, cityId: city.id, fields: 'card', limit: 100, page: 1 });
  const raw = Array.isArray(eventsRes.items) ? eventsRes.items : [];

  const filterOptions = buildFilterOptions(raw);

  return (
    <div className="container-page py-8 sm:py-10">
      <SaluteLandingPage
        city={{ id: city.id, slug: city.slug, name: city.name }}
        content={saluteContentForCity(citySlug)}
        events={raw}
        filterOptions={filterOptions}
      />
    </div>
  );
}

