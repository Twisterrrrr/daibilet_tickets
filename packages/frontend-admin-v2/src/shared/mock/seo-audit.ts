export interface SeoAuditRow {
  id: string;
  path: string;
  score: number;
  issues: number;
  checkedAt: string;
}

const ROWS: SeoAuditRow[] = [
  { id: 'seo-1', path: '/events/rechnaya-progulka', score: 88, issues: 2, checkedAt: '2025-03-24T08:00:00.000Z' },
  { id: 'seo-2', path: '/venues/ermitazh', score: 92, issues: 0, checkedAt: '2025-03-24T08:00:00.000Z' },
  { id: 'seo-3', path: '/spb', score: 71, issues: 6, checkedAt: '2025-03-23T18:00:00.000Z' },
];

export function getMockSeoAudit(): SeoAuditRow[] {
  return [...ROWS];
}
