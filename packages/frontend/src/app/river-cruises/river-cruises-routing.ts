/**
 * Маршрутизация кластера «речные прогулки».
 * URL `/river-cruises/...` — сервисные алиасы; канонический контент и SEO — только `/cities/.../...`.
 */

export type RiverCruiseCityRoute = {
  citySlug: string;
  cityName: string;
  /** Канонический путь городского лендинга */
  canonicalPath: string;
  /** Подпись на хабе (например, для временных surrogate) */
  hubHint?: string;
};

export const RIVER_CRUISE_CITY_ROUTES: RiverCruiseCityRoute[] = [
  {
    citySlug: 'moscow',
    cityName: 'Москва',
    canonicalPath: '/cities/moscow/rechnye-progulki',
  },
  {
    citySlug: 'saint-petersburg',
    cityName: 'Санкт-Петербург',
    canonicalPath: '/cities/saint-petersburg/reki-kanaly',
  },
  {
    citySlug: 'kazan',
    cityName: 'Казань',
    canonicalPath: '/cities/kazan/rechnye-progulki',
  },
  {
    citySlug: 'nizhny-novgorod',
    cityName: 'Нижний Новгород',
    canonicalPath: '/cities/nizhny-novgorod/rechnye-progulki',
  },
  {
    citySlug: 'kaliningrad',
    cityName: 'Калининград',
    canonicalPath: '/cities/kaliningrad/rechnye-progulki',
  },
  {
    citySlug: 'sochi',
    cityName: 'Сочи',
    canonicalPath: '/cities/sochi/rechnye-progulki',
  },
];

const ROUTE_BY_SLUG = Object.fromEntries(RIVER_CRUISE_CITY_ROUTES.map((r) => [r.citySlug, r])) as Record<
  string,
  RiverCruiseCityRoute
>;

export function getRiverCruiseCanonicalTarget(citySlug: string): RiverCruiseCityRoute | null {
  return ROUTE_BY_SLUG[citySlug] ?? null;
}

/**
 * Пара citySlug + landingSlug совпадает с каноном кластера «речные/водные» (/river-cruises, редиректы).
 * Если API лендинга даёт 404 (черновик / мало событий), безопаснее вести на страницу города, а не показывать notFound.
 */
export function matchesRiverCruiseCanonicalLanding(citySlug: string, landingSlug: string): boolean {
  const route = ROUTE_BY_SLUG[citySlug];
  if (!route) return false;
  const tail = route.canonicalPath.split('/').filter(Boolean).pop();
  return tail === landingSlug;
}

/** Канонический URL сегмента «речные/водные» для карточки из GET /landings. */
export function riverCruiseCanonicalHref(citySlug: string, landingSlug: string): string {
  if (citySlug === 'saint-petersburg' && landingSlug === 'reki-kanaly') {
    return '/cities/saint-petersburg/reki-kanaly';
  }
  return `/cities/${citySlug}/rechnye-progulki`;
}

export function isRiverCruiseHubLanding(landing: {
  slug: string;
  city?: { slug: string; name?: string } | null;
}): boolean {
  if (landing.slug === 'rechnye-progulki') return true;
  return landing.slug === 'reki-kanaly' && landing.city?.slug === 'saint-petersburg';
}

/** Внутренние ссылки для хаба (смежные интенты, не дублируем основной список городов). */
export const RIVER_CRUISE_HUB_RELATED: Array<{ href: string; title: string; description: string }> = [
  {
    href: '/cities/saint-petersburg/nochnye-mosty',
    title: 'Ночные мосты в Петербурге',
    description: 'Развод мостов и ночные рейсы по Неве — отдельный жирный кластер.',
  },
  {
    href: '/salute-9-may',
    title: 'Салют 9 мая по городам',
    description: 'Сезонный хаб: варианты с воды и советы по точкам обзора.',
  },
];
