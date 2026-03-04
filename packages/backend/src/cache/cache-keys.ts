/**
 * D1 — Централизованные ключи кэша и TTL.
 *
 * Все ключи строятся через helpers.
 * Использование: cacheKeys.events.detail(slug), cacheKeys.cities.list() и т.п.
 */

export const cacheKeys = {
  events: {
    detail: (slug: string) => `events:detail:${slug}`,
    list: (prefix = '') => (prefix ? `events:list:${prefix}` : 'events:list'),
  },
  cities: {
    list: (featured?: boolean | 'all') =>
      featured !== undefined && featured !== 'all' ? `cities:list:${featured}` : 'cities:list:all',
    detail: (slug: string) => `cities:detail:${slug}`,
  },
  tags: {
    list: () => 'tags:list',
  },
  regions: {
    preview: (hubCityId: string) => `regions:preview:hub:${hubCityId}`,
    detail: (slug: string) => `regions:detail:${slug}`,
  },
  collections: {
    list: (citySlug?: string) => `collections:list:${citySlug || 'all'}`,
    detail: (slug: string, page: number, limit: number) => `collections:detail:${slug}:${page}:${limit}`,
  },
  landings: {
    list: () => 'landings:list',
    detail: (slug: string) => `landings:detail:${slug}`,
  },
  combos: {
    list: () => 'combos:list',
    detail: (slug: string) => `combos:detail:${slug}`,
  },
  search: {
    query: (q: string, city?: string) => (city ? `search:${q}:${city}` : `search:${q}`),
    pattern: () => 'search:*',
  },
  /** T11: catalog list/detail keys. v2 = DoD PR2 (EventGroup, citiesPreview, nextDate) */
  catalog: {
    list: (paramsHash: string) => `catalog:list:${paramsHash}`,
    multiEvents: (key: string) => `catalog:multi:v2:${key}`,
    multiEventBySlug: (slug: string) => `catalog:multi:v2:slug:${slug}`,
    detail: (type: string, id: string) => `catalog:detail:${type}:${id}`,
  },
  pricing: {
    config: () => 'pricing:config',
  },
} as const;
