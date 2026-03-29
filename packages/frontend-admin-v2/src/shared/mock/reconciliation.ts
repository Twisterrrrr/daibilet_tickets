export interface ReconciliationRow {
  id: string;
  period: string;
  supplier: string;
  deltaRub: number;
  status: 'Сверено' | 'Расхождение' | 'В работе';
}

const ROWS: ReconciliationRow[] = [
  { id: 'rec-1', period: 'Март 2025', supplier: 'СПБ Ривер Тур', deltaRub: 0, status: 'Сверено' },
  { id: 'rec-2', period: 'Март 2025', supplier: 'Музейные ночи РФ', deltaRub: 1200, status: 'Расхождение' },
  { id: 'rec-3', period: 'Февраль 2025', supplier: 'RoofSPB', deltaRub: 0, status: 'В работе' },
];

export function getMockReconciliation(): ReconciliationRow[] {
  return [...ROWS];
}
