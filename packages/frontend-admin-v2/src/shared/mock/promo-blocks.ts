export interface PromoBlockRow {
  id: string;
  name: string;
  zone: string;
  active: boolean;
  period: string;
}

export interface PromoBlockDetail extends PromoBlockRow {
  priority: number;
  targetUrl: string;
  imageHint: string;
  scheduleDetail: string;
  audience: string;
  updatedAt: string;
  abVariant: string | null;
}

const DETAILS: PromoBlockDetail[] = [
  {
    id: 'pb-1',
    name: 'Баннер День города',
    zone: 'Главная · hero',
    active: true,
    period: 'май 2025',
    priority: 10,
    targetUrl: '/collections/spb-city-day',
    imageHint: '1920×600, ключевой текст слева',
    scheduleDetail: 'Показ с 2025-05-20 00:00 до 2025-05-27 23:59 (MSK)',
    audience: 'Все гости, гео СПб приоритет',
    updatedAt: '2025-03-08T12:00:00.000Z',
    abVariant: null,
  },
  {
    id: 'pb-2',
    name: 'Подборка «Небанальное»',
    zone: 'Каталог · sidebar',
    active: false,
    period: '—',
    priority: 3,
    targetUrl: '/collections/unusual',
    imageHint: 'Квадрат 400×400 для сайдбара',
    scheduleDetail: 'Не запланировано',
    audience: 'Возвратные пользователи',
    updatedAt: '2025-02-01T09:00:00.000Z',
    abVariant: 'sidebar_v2',
  },
];

function toRow(d: PromoBlockDetail): PromoBlockRow {
  return {
    id: d.id,
    name: d.name,
    zone: d.zone,
    active: d.active,
    period: d.period,
  };
}

export function getMockPromoBlocks(): PromoBlockRow[] {
  return DETAILS.map(toRow);
}

export function getMockPromoBlockById(id: string): PromoBlockDetail | undefined {
  return DETAILS.find((p) => p.id === id);
}
