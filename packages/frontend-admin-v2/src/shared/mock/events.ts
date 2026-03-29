import type { EventEntity } from '@/entities/event/types';

const EVENTS: EventEntity[] = [
  {
    id: 'evt-1',
    title: 'Речная прогулка по Неве и каналам',
    slug: 'rechnaya-progulka-neva-kanaly',
    city: 'Санкт-Петербург',
    shortDescription: 'Классический маршрут с аудиогидом, выход у Эрмитажа.',
    status: 'published',
    source: 'supplier',
    qualityScore: 92,
    issuesCount: 0,
    supplierName: 'СПБ Ривер Тур',
    sessionsSummary: '12 сеансов на неделю',
    createdAt: '2025-01-12T10:00:00.000Z',
    updatedAt: '2025-03-20T14:22:00.000Z',
  },
  {
    id: 'evt-2',
    title: 'Эрмитаж без очереди: малый групповой тур',
    slug: 'ermitazh-bez-ocheredi',
    city: 'Санкт-Петербург',
    shortDescription: 'Встреча у главного входа, лимит 12 человек.',
    status: 'scheduled',
    source: 'internal',
    qualityScore: 88,
    issuesCount: 2,
    supplierName: 'Дайбилет Экскурсии',
    sessionsSummary: 'ежедневно 10:30, 14:00',
    createdAt: '2025-02-01T09:15:00.000Z',
    updatedAt: '2025-03-21T08:05:00.000Z',
  },
  {
    id: 'evt-3',
    title: 'Крыши Петербурга: закатный маршрут',
    slug: 'kryshi-peterburga-zakat',
    city: 'Санкт-Петербург',
    shortDescription: 'Панорамные смотровые, возраст 14+.',
    status: 'draft',
    source: 'partner',
    qualityScore: 71,
    issuesCount: 5,
    supplierName: 'RoofSPB',
    sessionsSummary: 'по пятницам и субботам',
    createdAt: '2025-03-01T11:40:00.000Z',
    updatedAt: '2025-03-18T16:40:00.000Z',
  },
  {
    id: 'evt-4',
    title: 'Ночной дворец Артиллерийского музея',
    slug: 'nochnoy-dvorets-artmuzej',
    city: 'Москва',
    shortDescription: 'Подсветка фасадов и исторический тур.',
    status: 'published',
    source: 'import',
    qualityScore: 95,
    issuesCount: 0,
    supplierName: 'Музейные ночи РФ',
    sessionsSummary: '2 ночи в месяц',
    createdAt: '2024-11-20T12:00:00.000Z',
    updatedAt: '2025-03-19T19:12:00.000Z',
  },
  {
    id: 'evt-5',
    title: 'Зимний дворец: семейная программа',
    slug: 'zimniy-dvorets-semeynaya',
    city: 'Санкт-Петербург',
    shortDescription: 'Квест для детей 7–12 лет, 90 минут.',
    status: 'archived',
    source: 'internal',
    qualityScore: 82,
    issuesCount: 1,
    supplierName: 'Дайбилет Экскурсии',
    sessionsSummary: 'архив — сезон 2024',
    createdAt: '2024-06-10T08:00:00.000Z',
    updatedAt: '2025-01-05T12:00:00.000Z',
  },
];

export function getMockEvents(): EventEntity[] {
  return [...EVENTS];
}

export function getMockEventById(id: string): EventEntity | undefined {
  return EVENTS.find((e) => e.id === id);
}
