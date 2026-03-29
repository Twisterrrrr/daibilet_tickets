export interface ReviewRow {
  id: string;
  eventTitle: string;
  author: string;
  rating: number;
  status: 'Новый' | 'Опубликован' | 'Скрыт';
  createdAt: string;
}

const ROWS: ReviewRow[] = [
  {
    id: 'rv-1',
    eventTitle: 'Речная прогулка по Неве',
    author: 'Анна',
    rating: 5,
    status: 'Новый',
    createdAt: '2025-03-23T19:00:00.000Z',
  },
  {
    id: 'rv-2',
    eventTitle: 'Эрмитаж без очереди',
    author: 'Михаил',
    rating: 4,
    status: 'Опубликован',
    createdAt: '2025-03-21T09:00:00.000Z',
  },
];

export function getMockReviews(): ReviewRow[] {
  return [...ROWS];
}
