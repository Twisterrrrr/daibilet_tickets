export interface PromoBlockRow {
  id: string;
  name: string;
  zone: string;
  active: boolean;
  period: string;
}

const ROWS: PromoBlockRow[] = [
  { id: 'pb-1', name: 'Баннер День города', zone: 'Главная · hero', active: true, period: 'май 2025' },
  { id: 'pb-2', name: 'Подборка «Небанальное»', zone: 'Каталог · sidebar', active: false, period: '—' },
];

export function getMockPromoBlocks(): PromoBlockRow[] {
  return [...ROWS];
}
