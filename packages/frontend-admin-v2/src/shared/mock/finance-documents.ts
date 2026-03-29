export interface FinanceDocumentRow {
  id: string;
  number: string;
  supplier: string;
  kind: 'Акт' | 'Счёт' | 'Отчёт';
  amount: number;
  currency: string;
  status: 'Выставлен' | 'Оплачен' | 'Спор';
  date: string;
}

const ROWS: FinanceDocumentRow[] = [
  {
    id: 'fd-1',
    number: 'АВР-10421',
    supplier: 'СПБ Ривер Тур',
    kind: 'Акт',
    amount: 128000,
    currency: 'RUB',
    status: 'Оплачен',
    date: '2025-03-20T00:00:00.000Z',
  },
  {
    id: 'fd-2',
    number: 'СЧ-8833',
    supplier: 'RoofSPB',
    kind: 'Счёт',
    amount: 45000,
    currency: 'RUB',
    status: 'Выставлен',
    date: '2025-03-22T00:00:00.000Z',
  },
];

export function getMockFinanceDocuments(): FinanceDocumentRow[] {
  return [...ROWS];
}
