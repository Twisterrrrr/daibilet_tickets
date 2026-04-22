export interface CityRow {
  id: string;
  name: string;
  region: string;
  slug: string;
  eventsCount: number;
  updatedAt: string;
}

export interface CityHubZone {
  id: string;
  title: string;
  detail: string;
}

export interface CityHubDetail extends CityRow {
  /** Подзаголовок на карточке хаба (витрина / админка) */
  heroSubtitle: string;
  /** Длинное описание для SEO и страницы города (City.description) */
  description: string;
  /** Зоны контента хаба (подборки, гиды, промо) */
  zones: CityHubZone[];
  /** Краткие KPI для шапки */
  metrics: { label: string; value: string; hint?: string }[];
  venuesCount: number;
  timezone: string;
  highlightBulletPoints: string[];
  /** City.metaTitle */
  metaTitle: string;
  /** City.metaDescription */
  metaDescription: string;
  /** City.heroImage */
  heroImage: string | null;
  /** City.lat / lng — строкой для мока */
  lat: string | null;
  lng: string | null;
  /** City.isActive */
  isActive: boolean;
  /** City.isFeatured */
  isFeatured: boolean;
  /** City.version */
  version: number;
  /** City.createdAt */
  createdAt: string;
  /** Псевдонимы для поиска и подсказок (не в City; регион/алиасы — отдельно на бэке) */
  aliases: string[];
  /** Доп. метрика для вкладки «Каталог» */
  suppliersCount?: number;
}

const CITY_HUBS: CityHubDetail[] = [
  {
    id: 'c-1',
    name: 'Санкт-Петербург',
    region: 'СЗФО',
    slug: 'spb',
    eventsCount: 1284,
    updatedAt: '2025-03-21T08:00:00.000Z',
    heroSubtitle: 'Северная столица — ключевой хаб водных и дворцовых маршрутов',
    description:
      'Город как продукт: единая точка входа для гостя и для редакторов. Здесь сводятся подборки «Нева и каналы», сезонные гиды, локальные промо-зоны витрины и агрегаты каталога (события, площадки, поставщики). В админке хаб задаёт tone of voice блоков, приоритет коллекций и связь с гео-фильтрами.',
    zones: [
      {
        id: 'z-1',
        title: 'Витрина и коллекции',
        detail: 'Главный экран города, карусели, привязка к Collection API и ручные пины.',
      },
      {
        id: 'z-2',
        title: 'Контент и SEO',
        detail: 'Тексты для H1/H2, FAQ, внутренние ссылки на топ-события и районы.',
      },
      {
        id: 'z-3',
        title: 'Операции',
        detail: 'Чёрные даты, стоп-продажи по городу, синхронизация с модерацией и поддержкой.',
      },
    ],
    metrics: [
      { label: 'Активных событий', value: '1284', hint: 'по витрине' },
      { label: 'Площадок', value: '186', hint: 'привязано к городу' },
      { label: 'Поставщиков', value: '54', hint: 'с офферами в городе' },
      { label: 'Средний fill-rate', value: '71%', hint: 'mock KPI' },
    ],
    venuesCount: 186,
    timezone: 'Europe/Moscow',
    highlightBulletPoints: [
      'Связь с федеральным справочником и локальными алиасами (СПб / Петербург).',
      'Отдельные слоты промо под высокий сезон и white nights.',
      'Редактор хаба не заменяет карточку события — только навигация и контекст.',
    ],
    metaTitle: 'Санкт-Петербург — события и билеты | Дайбилет',
    metaDescription:
      'Афиша Санкт-Петербурга: экскурсии по Неве, дворцы, музеи. Билеты онлайн, актуальное расписание и спокойная покупка.',
    heroImage: 'https://cdn.example/cities/spb-hero.webp',
    lat: '59.934280',
    lng: '30.335098',
    isActive: true,
    isFeatured: true,
    version: 12,
    createdAt: '2023-06-01T09:00:00.000Z',
    aliases: ['СПб', 'Петербург', 'Saint Petersburg'],
    suppliersCount: 54,
  },
  {
    id: 'c-2',
    name: 'Москва',
    region: 'ЦФО',
    slug: 'msk',
    eventsCount: 956,
    updatedAt: '2025-03-20T14:10:00.000Z',
    heroSubtitle: 'Столица — максимум спроса и жёсткая конкуренция слотов',
    description:
      'Хаб Москвы агрегирует высокочастотный трафик: блоки «Сегодня в городе», корпоративные подборки и B2B-витрины. В админке важны лимиты на промо, приоритет партнёрских зон и быстрый доступ к сверке ёмкости по округам.',
    zones: [
      {
        id: 'z-1',
        title: 'Спрос и слоты',
        detail: 'Тепловая карта выходных, рекомендации по ценам и переносам сеансов.',
      },
      {
        id: 'z-2',
        title: 'B2B и корпораты',
        detail: 'Отдельные коллекции и лендинги под организаторов без смешения с B2C.',
      },
    ],
    metrics: [
      { label: 'Активных событий', value: '956' },
      { label: 'Площадок', value: '142' },
      { label: 'Заказов / мес', value: '48k', hint: 'mock' },
      { label: 'Доля новых гостей', value: '38%', hint: 'mock' },
    ],
    venuesCount: 142,
    timezone: 'Europe/Moscow',
    highlightBulletPoints: [
      'Поддержка нескольких поддоменов и UTM-зон без дублирования каталога.',
      'Интеграция с городскими фестивалями — отдельный флаг «массовое мероприятие».',
    ],
    metaTitle: 'Москва — события, экскурсии и билеты',
    metaDescription:
      'Что посмотреть в Москве: экскурсии, музеи, мероприятия на любой вкус. Билеты без очередей на Дайбилет.',
    heroImage: 'https://cdn.example/cities/msk-hero.webp',
    lat: '55.755864',
    lng: '37.617698',
    isActive: true,
    isFeatured: true,
    version: 9,
    createdAt: '2023-06-01T09:00:00.000Z',
    aliases: ['МСК'],
    suppliersCount: 41,
  },
  {
    id: 'c-3',
    name: 'Казань',
    region: 'ПФО',
    slug: 'kzn',
    eventsCount: 312,
    updatedAt: '2025-03-18T10:00:00.000Z',
    heroSubtitle: 'Региональный хаб с акцентом на семейный и MICE-сегмент',
    description:
      'Казань как хаб объединяет речные маршруты, музейные кластеры и события у Кремля. Контентные зоны проще, чем в столицах, но выше доля сезонных пиков — важны шаблоны быстрого обновления обложек и расписаний.',
    zones: [
      {
        id: 'z-1',
        title: 'Сезонность',
        detail: 'Летние и зимние пресеты коллекций, автоматические баннеры.',
      },
      {
        id: 'z-2',
        title: 'Партнёры региона',
        detail: 'Локальные DMO и отели — отдельный список для кросс-промо.',
      },
    ],
    metrics: [
      { label: 'Активных событий', value: '312' },
      { label: 'Площадок', value: '61' },
      { label: 'Средний чек', value: '2050 ₽', hint: 'mock' },
    ],
    venuesCount: 61,
    timezone: 'Europe/Moscow',
    highlightBulletPoints: ['Гибридные маршруты: город + пригород без путаницы в фильтрах.'],
    metaTitle: 'Казань — афиша событий и билеты',
    metaDescription:
      'События Казани: Кремль, музеи, речные прогулки. Удобная покупка билетов и расписание на Дайбилет.',
    heroImage: null,
    lat: '55.796391',
    lng: '49.108891',
    isActive: true,
    isFeatured: false,
    version: 4,
    createdAt: '2024-01-15T11:00:00.000Z',
    aliases: ['Kazan'],
    suppliersCount: 18,
  },
];

function toRow(h: CityHubDetail): CityRow {
  return {
    id: h.id,
    name: h.name,
    region: h.region,
    slug: h.slug,
    eventsCount: h.eventsCount,
    updatedAt: h.updatedAt,
  };
}

export function getMockCities(): CityRow[] {
  return CITY_HUBS.map(toRow);
}

export function getMockCityHubById(id: string): CityHubDetail | undefined {
  return CITY_HUBS.find((c) => c.id === id);
}
