export interface LandingRow {
  id: string;
  title: string;
  /** Сегмент URL без ведущего слэша — ключ мультилендинга (один slug, несколько городов). */
  slug: string;
  path: string;
  status: 'Активен' | 'Скрыт';
  updatedAt: string;
}

export interface LandingDetail extends LandingRow {
  campaignTag: string;
  heroTitle: string;
  heroSubtitle: string;
  seoTitle: string;
  seoDescription: string;
  blocksSummary: { id: string; label: string; kind: string }[];
  cityHint: string;
  version: number;
}

export interface LandingTopicSummaryRow {
  slug: string;
  variants: number;
  citiesLabel: string;
  sampleTitle: string;
}

const DETAILS: LandingDetail[] = [
  {
    id: 'l-1',
    title: 'Лето на воде',
    slug: 'summer-boats',
    path: '/summer-boats',
    status: 'Активен',
    updatedAt: '2025-03-10T10:00:00.000Z',
    campaignTag: 'summer-2025-water',
    heroTitle: 'Лето на воде',
    heroSubtitle: 'Теплоходы и маршруты по Неве и Финскому заливу',
    seoTitle: 'Лето на воде — экскурсии и прогулки',
    seoDescription: 'Подборка водных маршрутов на лето: расписание и билеты.',
    blocksSummary: [
      { id: 'b1', label: 'Hero + CTA', kind: 'hero' },
      { id: 'b2', label: 'Сетка событий (ручной пин)', kind: 'events_grid' },
      { id: 'b3', label: 'FAQ', kind: 'faq' },
    ],
    cityHint: 'Санкт-Петербург (по умолчанию)',
    version: 4,
  },
  {
    id: 'l-2',
    title: 'Музейная карта',
    slug: 'museum-map',
    path: '/museum-map',
    status: 'Скрыт',
    updatedAt: '2025-02-28T18:00:00.000Z',
    campaignTag: 'museums-q1',
    heroTitle: 'Музейная карта Петербурга',
    heroSubtitle: 'Черновик — связка с коллекцией и картой площадок',
    seoTitle: 'Музеи Санкт-Петербурга на карте',
    seoDescription: 'Интерактивная карта музеев и выставок.',
    blocksSummary: [
      { id: 'b1', label: 'Hero', kind: 'hero' },
      { id: 'b2', label: 'Карта (виджет)', kind: 'map' },
    ],
    cityHint: 'Санкт-Петербург',
    version: 1,
  },
  {
    id: 'l-3',
    title: 'Лето на воде — Москва',
    slug: 'summer-boats',
    path: '/summer-boats',
    status: 'Активен',
    updatedAt: '2025-03-12T14:20:00.000Z',
    campaignTag: 'summer-2025-water-msk',
    heroTitle: 'Лето на воде',
    heroSubtitle: 'Речные маршруты по Москве-реке',
    seoTitle: 'Лето на воде — Москва',
    seoDescription: 'Прогулки и экскурсии на теплоходах в Москве.',
    blocksSummary: [
      { id: 'b1', label: 'Hero + CTA', kind: 'hero' },
      { id: 'b2', label: 'Сетка событий', kind: 'events_grid' },
    ],
    cityHint: 'Москва',
    version: 2,
  },
];

function toRow(d: LandingDetail): LandingRow {
  return {
    id: d.id,
    title: d.title,
    slug: d.slug,
    path: d.path,
    status: d.status,
    updatedAt: d.updatedAt,
  };
}

export function getMockLandings(): LandingRow[] {
  return DETAILS.map(toRow);
}

export function getMockLandingById(id: string): LandingDetail | undefined {
  return DETAILS.find((l) => l.id === id);
}

export function getMockLandingsBySlug(slug: string): LandingDetail[] {
  return DETAILS.filter((l) => l.slug === slug);
}

export function getMockLandingTopicSummaries(): LandingTopicSummaryRow[] {
  const bySlug = new Map<string, LandingDetail[]>();
  for (const d of DETAILS) {
    const list = bySlug.get(d.slug) ?? [];
    list.push(d);
    bySlug.set(d.slug, list);
  }
  return [...bySlug.entries()].map(([slug, list]) => ({
    slug,
    variants: list.length,
    citiesLabel: [...new Set(list.map((x) => x.cityHint))].join(' · '),
    sampleTitle: list[0]?.title ?? slug,
  }));
}
