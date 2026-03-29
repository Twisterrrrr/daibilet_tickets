export interface CollectionRow {
  id: string;
  title: string;
  slug: string;
  itemsCount: number;
  status: 'Черновик' | 'Опубликовано';
}

const ROWS: CollectionRow[] = [
  { id: 'col-1', title: 'Выходные в Петербурге', slug: 'spb-weekend', itemsCount: 24, status: 'Опубликовано' },
  { id: 'col-2', title: 'Семейный май', slug: 'family-may', itemsCount: 18, status: 'Черновик' },
];

export function getMockCollections(): CollectionRow[] {
  return [...ROWS];
}
