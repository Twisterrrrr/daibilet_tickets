export interface CityRow {
  id: string;
  name: string;
  region: string;
  slug: string;
  eventsCount: number;
  updatedAt: string;
}

const ROWS: CityRow[] = [
  {
    id: 'c-1',
    name: 'Санкт-Петербург',
    region: 'СЗФО',
    slug: 'spb',
    eventsCount: 1284,
    updatedAt: '2025-03-21T08:00:00.000Z',
  },
  {
    id: 'c-2',
    name: 'Москва',
    region: 'ЦФО',
    slug: 'msk',
    eventsCount: 956,
    updatedAt: '2025-03-20T14:10:00.000Z',
  },
  {
    id: 'c-3',
    name: 'Казань',
    region: 'ПФО',
    slug: 'kzn',
    eventsCount: 312,
    updatedAt: '2025-03-18T10:00:00.000Z',
  },
];

export function getMockCities(): CityRow[] {
  return [...ROWS];
}
