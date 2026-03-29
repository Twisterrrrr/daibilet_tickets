export type DashboardStatIcon = 'orders' | 'revenue' | 'events' | 'promo';

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  delta?: string;
  tone?: 'neutral' | 'positive' | 'warning';
  icon: DashboardStatIcon;
}

/** Короткая плитка «что проверить» — как в референсе, без тяжёлых карточек */
export interface DashboardAttentionSignal {
  id: string;
  label: string;
  count: number;
  href: string;
}

export interface DashboardCardQualityRow {
  id: string;
  title: string;
  /** Пастельные микро-метки: чего не хватает */
  gaps: string[];
}

export interface DashboardCityCoverage {
  id: string;
  city: string;
  current: number;
  total: number;
}

export interface DashboardCategoryStripItem {
  id: string;
  label: string;
  /** 0–100 для тонкой полоски */
  weight: number;
}

export interface DashboardActivityItem {
  id: string;
  title: string;
  meta: string;
  at: string;
}

export interface DashboardOverview {
  stats: DashboardStat[];
  attentionSignals: DashboardAttentionSignal[];
  cardQuality: DashboardCardQualityRow[];
  cityCoverage: DashboardCityCoverage[];
  categoryStrip: DashboardCategoryStripItem[];
  activity: DashboardActivityItem[];
  quickLinks: { label: string; href: string; description: string }[];
}

export function getMockDashboardOverview(): DashboardOverview {
  return {
    stats: [
      { id: 's1', label: 'Заказы', value: '14', delta: 'за сегодня', tone: 'neutral', icon: 'orders' },
      { id: 's2', label: 'Выручка', value: '42 800 ₽', delta: 'по оплатам', tone: 'positive', icon: 'revenue' },
      { id: 's3', label: 'Активных событий', value: '6', delta: 'в каталоге', tone: 'neutral', icon: 'events' },
      { id: 's4', label: 'CTR промо', value: '3.2%', delta: 'за 7 дней', tone: 'neutral', icon: 'promo' },
    ],
    attentionSignals: [
      { id: 'sig1', label: 'Без фото', count: 12, href: '/events' },
      { id: 'sig2', label: 'Без расписания', count: 8, href: '/events' },
      { id: 'sig3', label: 'Новые отзывы', count: 5, href: '/reviews' },
      { id: 'sig4', label: 'Черновики модерации', count: 4, href: '/moderation' },
      { id: 'sig5', label: 'Площадки без города', count: 3, href: '/venues' },
      { id: 'sig6', label: 'SEO: пустой title', count: 9, href: '/seo-audit' },
    ],
    cardQuality: [
      {
        id: 'cq1',
        title: 'Master class in pottery',
        gaps: ['Фото', 'Расписание'],
      },
      {
        id: 'cq2',
        title: 'Ночная прогулка по каналам',
        gaps: ['SEO'],
      },
      {
        id: 'cq3',
        title: 'Эрмитаж без очереди',
        gaps: [],
      },
    ],
    cityCoverage: [
      { id: 'ct1', city: 'Санкт-Петербург', current: 42, total: 50 },
      { id: 'ct2', city: 'Москва', current: 30, total: 45 },
      { id: 'ct3', city: 'Казань', current: 12, total: 28 },
      { id: 'ct4', city: 'Сочи', current: 8, total: 20 },
    ],
    categoryStrip: [
      { id: 'cat1', label: 'Экскурсии', weight: 100 },
      { id: 'cat2', label: 'Теплоходы', weight: 72 },
      { id: 'cat3', label: 'Музеи', weight: 58 },
      { id: 'cat4', label: 'Крыши и панорамы', weight: 44 },
    ],
    activity: [
      {
        id: 'ac1',
        title: 'Обновлена площадка «Александринский театр»',
        meta: 'Медиа и SEO',
        at: '2025-03-22T11:20:00.000Z',
      },
      {
        id: 'ac2',
        title: 'Опубликовано событие «Ночной дворец Артиллерийского музея»',
        meta: 'Москва · импорт',
        at: '2025-03-19T19:12:00.000Z',
      },
      {
        id: 'ac3',
        title: 'Возврат по заказу DB-104800',
        meta: 'Музейные ночи РФ',
        at: '2025-03-19T08:30:00.000Z',
      },
    ],
    quickLinks: [
      { label: 'Новое событие', href: '/events', description: 'Черновик и базовые поля' },
      { label: 'Проверка площадок', href: '/venues', description: 'Город и готовность' },
      { label: 'Заказы', href: '/orders', description: 'Статусы и суммы' },
    ],
  };
}
