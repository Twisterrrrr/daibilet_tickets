export interface LandingRow {
  id: string;
  title: string;
  path: string;
  status: 'Активен' | 'Скрыт';
  updatedAt: string;
}

const ROWS: LandingRow[] = [
  {
    id: 'l-1',
    title: 'Лето на воде',
    path: '/summer-boats',
    status: 'Активен',
    updatedAt: '2025-03-10T10:00:00.000Z',
  },
  { id: 'l-2', title: 'Музейная карта', path: '/museum-map', status: 'Скрыт', updatedAt: '2025-02-28T18:00:00.000Z' },
];

export function getMockLandings(): LandingRow[] {
  return [...ROWS];
}
