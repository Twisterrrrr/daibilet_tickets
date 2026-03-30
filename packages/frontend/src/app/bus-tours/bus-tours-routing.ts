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
