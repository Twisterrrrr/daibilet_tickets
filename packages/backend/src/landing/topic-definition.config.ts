/**
 * TopicDefinition — правила видимости лендингов.
 * Используется LandingMaterializerService для автоуправления isActive.
 *
 * @see docs/TopicDefinitionMatrix.md
 */

export type PageType = 'city' | 'collection';

export interface TopicDefinitionCity {
  citySlug: string;
  slug: string;
  filterTag: string;
  minEvents: number;
}

export interface TopicDefinitionCollection {
  slug: string;
  filterTags: string[];
  minEvents: number;
}

/**
 * Городские лендинги: city + topic → правило.
 * Materializer ищет LandingPage по (city.slug, landing.slug) и обновляет isActive.
 */
export const TOPIC_DEFINITIONS_CITY: TopicDefinitionCity[] = [
  // Санкт-Петербург
  { citySlug: 'saint-petersburg', slug: 'nochnye-mosty', filterTag: 'nochnye-mosty', minEvents: 2 },
  { citySlug: 'saint-petersburg', slug: 'reki-kanaly', filterTag: 'panoramnyi', minEvents: 3 },
  { citySlug: 'saint-petersburg', slug: 'avtobusnye-ekskursii', filterTag: 'bus-tours-saint-petersburg', minEvents: 3 },
  { citySlug: 'saint-petersburg', slug: 'meteory', filterTag: 'meteor-petergof', minEvents: 3 },
  { citySlug: 'saint-petersburg', slug: 'salyut', filterTag: 'salyut-s-vody', minEvents: 2 },
  // Москва
  { citySlug: 'moscow', slug: 'rechnye-progulki', filterTag: 'rechnye-progulki-msk', minEvents: 3 },
  { citySlug: 'moscow', slug: 'avtobusnye-ekskursii', filterTag: 'bus-tours-moscow', minEvents: 3 },
  // Казань
  { citySlug: 'kazan', slug: 'rechnye-progulki', filterTag: 'river-cruises-kazan', minEvents: 0 },
  { citySlug: 'kazan', slug: 'sviyazhsk', filterTag: 'sviyazhsk', minEvents: 2 },
  // Нижний Новгород
  { citySlug: 'nizhny-novgorod', slug: 'rechnye-progulki', filterTag: 'river-cruises-nizhny-novgorod', minEvents: 0 },
  { citySlug: 'nizhny-novgorod', slug: 'progulki-po-volge', filterTag: 'progulki-volga-nn', minEvents: 3 },
  { citySlug: 'nizhny-novgorod', slug: 'nizhegorodskij-kreml', filterTag: 'kreml-nn', minEvents: 2 },
  { citySlug: 'nizhny-novgorod', slug: 'kanatnaya-doroga', filterTag: 'kanatka-nn', minEvents: 2 },
  // Калининград
  { citySlug: 'kaliningrad', slug: 'rechnye-progulki', filterTag: 'river-cruises-kaliningrad', minEvents: 2 },
  { citySlug: 'kaliningrad', slug: 'kurshskaya-kosa', filterTag: 'kurshskaya-kosa', minEvents: 2 },
  // Сочи
  { citySlug: 'sochi', slug: 'rechnye-progulki', filterTag: 'river-cruises-sochi', minEvents: 2 },
  // Ярославль
  { citySlug: 'yaroslavl', slug: 'strelka-i-volga', filterTag: 'strelka-yaroslavl', minEvents: 2 },
  // Владимир
  { citySlug: 'vladimir', slug: 'zolotye-vorota', filterTag: 'zolotye-vorota-vlad', minEvents: 2 },
];
