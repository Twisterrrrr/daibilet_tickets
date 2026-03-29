export interface TagRow {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
}

const ROWS: TagRow[] = [
  { id: 't-1', name: 'Речные прогулки', slug: 'river', usageCount: 420 },
  { id: 't-2', name: 'Музеи', slug: 'museums', usageCount: 890 },
  { id: 't-3', name: 'Детям', slug: 'kids', usageCount: 210 },
  { id: 't-4', name: 'Вечером', slug: 'evening', usageCount: 156 },
];

export function getMockTags(): TagRow[] {
  return [...ROWS];
}
