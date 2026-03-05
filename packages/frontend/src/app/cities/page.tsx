import type { CityListItem } from '@daibilet/shared';
import type { Metadata } from 'next';

import { CityCard } from '@/components/ui/CityCard';
import { api } from '@/lib/api';
import { CITY_INFO } from '@/lib/cityInfo';
import { CITY_IMAGES } from '@/lib/cityImages';

export const metadata: Metadata = {
  title: 'Города России — экскурсии, музеи и мероприятия',
  description:
    'Выберите город для посещения. Билеты на экскурсии, музеи и мероприятия в Москве, Петербурге, Казани, Владимире, Ярославле и других городах.',
};

type RegionVM = {
  slug: string;
  name: string;
  eventCount: number;
};

type CityCardVM = {
  id: string;
  slug: string;
  name: string;
  heroImage: string | null;
  eventCount: number;
  venueCount: number;
  description?: string | null;
  region?: RegionVM | null;
};

type ExtendedCity = CityListItem & {
  description?: string | null;
  museumCount?: number;
  _count?: { venues?: number; events?: number };
  region?: { slug: string; name: string; eventCount: number } | null;
};

function toCityCardVM(c: ExtendedCity): CityCardVM {
  const count = c._count ?? { events: 0, venues: 0 };
  const fallbackInfo = CITY_INFO[c.slug];
  const imageConfig = CITY_IMAGES[c.slug];
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    // Приоритет: статичная оптимизированная картинка из CITY_IMAGES → heroImage из БД.
    heroImage: imageConfig?.card ?? c.heroImage,
    eventCount: count.events ?? 0,
    // museumCount на бэке уже считает venues + events-at-venues; fallback — просто количество venues.
    venueCount: c.museumCount ?? count.venues ?? 0,
    // Приоритет как на странице города: сначала маркетинговый brief из CITY_INFO,
    // затем описание из БД (city.description), затем ничего.
    description: fallbackInfo?.brief ?? c.description ?? null,
    region: c.region ?? null,
  };
}

export default async function CitiesPage() {
  let cities: CityListItem[] = [];
  try {
    cities = await api.getCities();
  } catch {
    // API недоступен — покажем пустое состояние
  }

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Города</h1>
        <p className="mt-2 text-lg text-slate-500">Выберите город — найдём лучшие экскурсии, музеи и мероприятия</p>
      </div>

      {/* Cities grid */}
      {cities.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => {
            const vm = toCityCardVM(city as ExtendedCity);
            return (
              <CityCard
                key={vm.id}
                slug={vm.slug}
                name={vm.name}
                heroImage={vm.heroImage}
                eventCount={vm.eventCount}
                venueCount={vm.venueCount}
                description={vm.description}
                region={vm.region ?? undefined}
                large
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center">
          <p className="text-lg text-slate-400">Города загружаются...</p>
          <p className="mt-1 text-sm text-slate-400">Убедитесь, что API запущен на порту 4000</p>
        </div>
      )}
    </div>
  );
}
