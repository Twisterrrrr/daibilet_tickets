export interface CatalogConsistencyRow {
  id: string;
  entity: string;
  issue: string;
  severity: 'Низкий' | 'Средний' | 'Высокий';
  count: number;
}

const ROWS: CatalogConsistencyRow[] = [
  {
    id: 'cc-1',
    entity: 'Событие',
    issue: 'Пустое SEO description',
    severity: 'Средний',
    count: 14,
  },
  {
    id: 'cc-2',
    entity: 'Площадка',
    issue: 'Нет привязки к городу',
    severity: 'Высокий',
    count: 3,
  },
  {
    id: 'cc-3',
    entity: 'Сеанс',
    issue: 'endsAt раньше startsAt',
    severity: 'Низкий',
    count: 1,
  },
];

export function getMockCatalogConsistency(): CatalogConsistencyRow[] {
  return [...ROWS];
}
