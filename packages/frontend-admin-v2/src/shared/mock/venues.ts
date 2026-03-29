import type { VenueEntity } from '@/entities/venue/types';

const VENUES: VenueEntity[] = [
  {
    id: 'ven-1',
    name: 'Причал Английской набережной',
    city: 'Санкт-Петербург',
    type: 'boat',
    status: 'live',
    qualityScore: 94,
    eventsCount: 6,
    shortDescription: 'Отправление теплоходов, зона ожидания под навесом.',
    createdAt: '2024-09-01T10:00:00.000Z',
    updatedAt: '2025-03-10T09:00:00.000Z',
  },
  {
    id: 'ven-2',
    name: 'Государственный Эрмитаж — главный штаб',
    city: 'Санкт-Петербург',
    type: 'museum',
    status: 'ready',
    qualityScore: 91,
    eventsCount: 14,
    shortDescription: 'Вход через Дворцовую площадь, отдельная группа.',
    createdAt: '2024-05-12T14:00:00.000Z',
    updatedAt: '2025-03-22T11:20:00.000Z',
  },
  {
    id: 'ven-3',
    name: 'Александринский театр',
    city: 'Санкт-Петербург',
    type: 'theater',
    status: 'live',
    qualityScore: 89,
    eventsCount: 9,
    shortDescription: 'Классические постановки, онлайн-бронь мест.',
    createdAt: '2024-07-20T11:30:00.000Z',
    updatedAt: '2025-03-15T18:45:00.000Z',
  },
  {
    id: 'ven-4',
    name: 'Музей Артиллерии — главный двор',
    city: 'Москва',
    type: 'museum',
    status: 'paused',
    qualityScore: 76,
    eventsCount: 3,
    shortDescription: 'Сезонная площадка, уточнять доступность.',
    createdAt: '2024-10-01T09:00:00.000Z',
    updatedAt: '2025-02-28T12:00:00.000Z',
  },
  {
    id: 'ven-5',
    name: 'Маршрут «Золотое кольцо» — старт у Спасской',
    city: 'Москва',
    type: 'walking',
    status: 'draft',
    qualityScore: 68,
    eventsCount: 1,
    shortDescription: 'Пешеходный маршрут 4 км, влагоустойчивая обувь.',
    createdAt: '2025-03-02T16:00:00.000Z',
    updatedAt: '2025-03-02T16:00:00.000Z',
  },
];

export function getMockVenues(): VenueEntity[] {
  return [...VENUES];
}

export function getMockVenueById(id: string): VenueEntity | undefined {
  return VENUES.find((v) => v.id === id);
}
