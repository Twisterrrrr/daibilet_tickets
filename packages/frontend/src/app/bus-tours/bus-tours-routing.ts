/**
 * Кластер «автобусные экскурсии и обзорные туры».
 * URL `/bus-tours/...` — сервисные алиасы; канон — `/cities/.../avtobusnye-ekskursii`.
 */

export type BusTourCityRoute = {
  citySlug: string;
  cityName: string;
  canonicalPath: string;
};

export const BUS_TOUR_CITY_ROUTES: BusTourCityRoute[] = [
  {
    citySlug: 'moscow',
    cityName: 'Москва',
    canonicalPath: '/cities/moscow/avtobusnye-ekskursii',
  },
  {
    citySlug: 'saint-petersburg',
    cityName: 'Санкт-Петербург',
    canonicalPath: '/cities/saint-petersburg/avtobusnye-ekskursii',
  },
  {
    citySlug: 'volgograd',
    cityName: 'Волгоград',
    canonicalPath: '/cities/volgograd/avtobusnye-ekskursii',
  },
  {
    citySlug: 'perm',
    cityName: 'Пермь',
    canonicalPath: '/cities/perm/avtobusnye-ekskursii',
  },
  {
    citySlug: 'samara',
    cityName: 'Самара',
    canonicalPath: '/cities/samara/avtobusnye-ekskursii',
  },
  {
    citySlug: 'tver',
    cityName: 'Тверь',
    canonicalPath: '/cities/tver/avtobusnye-ekskursii',
  },
  {
    citySlug: 'novosibirsk',
    cityName: 'Новосибирск',
    canonicalPath: '/cities/novosibirsk/avtobusnye-ekskursii',
  },
  {
    citySlug: 'krasnoyarsk',
    cityName: 'Красноярск',
    canonicalPath: '/cities/krasnoyarsk/avtobusnye-ekskursii',
  },
  {
    citySlug: 'ekaterinburg',
    cityName: 'Екатеринбург',
    canonicalPath: '/cities/ekaterinburg/avtobusnye-ekskursii',
  },
  {
    citySlug: 'rostov-na-donu',
    cityName: 'Ростов-на-Дону',
    canonicalPath: '/cities/rostov-na-donu/avtobusnye-ekskursii',
  },
  {
    citySlug: 'yaroslavl',
    cityName: 'Ярославль',
    canonicalPath: '/cities/yaroslavl/avtobusnye-ekskursii',
  },
  {
    citySlug: 'kazan',
    cityName: 'Казань',
    canonicalPath: '/cities/kazan/avtobusnye-ekskursii',
  },
  {
    citySlug: 'kaliningrad',
    cityName: 'Калининград',
    canonicalPath: '/cities/kaliningrad/avtobusnye-ekskursii',
  },
  {
    citySlug: 'nizhny-novgorod',
    cityName: 'Нижний Новгород',
    canonicalPath: '/cities/nizhny-novgorod/avtobusnye-ekskursii',
  },
  {
    citySlug: 'sochi',
    cityName: 'Сочи',
    canonicalPath: '/cities/sochi/avtobusnye-ekskursii',
  },
];

const ROUTE_BY_SLUG = Object.fromEntries(BUS_TOUR_CITY_ROUTES.map((r) => [r.citySlug, r])) as Record<
  string,
  BusTourCityRoute
>;

export function getBusTourCanonicalTarget(citySlug: string): BusTourCityRoute | null {
  return ROUTE_BY_SLUG[citySlug] ?? null;
}

export function matchesBusToursCanonicalLanding(citySlug: string, landingSlug: string): boolean {
  const route = ROUTE_BY_SLUG[citySlug];
  if (!route) return false;
  const tail = route.canonicalPath.split('/').filter(Boolean).pop();
  return tail === landingSlug;
}

/** Канонический URL лендинга кластера (slug в БД — avtobusnye-ekskursii). */
export function busTourCanonicalHref(citySlug: string): string {
  return `/cities/${citySlug}/avtobusnye-ekskursii`;
}

export function isBusToursHubLanding(landing: {
  slug: string;
  city?: { slug: string; name?: string } | null;
}): boolean {
  return landing.slug === 'avtobusnye-ekskursii';
}

export const BUS_TOUR_HUB_RELATED: Array<{ href: string; title: string; description: string }> = [
  {
    href: '/river-cruises',
    title: 'Речные прогулки по городам',
    description: 'Водные маршруты и теплоходы — отдельный хаб с каноническими страницами.',
  },
  {
    href: '/cities/saint-petersburg/nochnye-mosty',
    title: 'Ночные мосты в Петербурге',
    description: 'Ночные рейсы и развод мостов.',
  },
];
