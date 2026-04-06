export interface PromoCodeRow {
  id: string;
  code: string;
  discountLabel: string;
  redemptions: number;
  limit: number | null;
  status: 'Активен' | 'План' | 'Архив';
  validUntil: string | null;
}

export interface PromoCollectionRow {
  id: string;
  name: string;
  slug: string;
  placements: number;
  status: 'Активна' | 'Черновик';
  updatedAt: string;
}

export interface UpsellRuleRow {
  id: string;
  title: string;
  trigger: string;
  offer: string;
  priority: number;
  status: 'Вкл' | 'Выкл';
}

const PROMO_CODES: PromoCodeRow[] = [
  {
    id: 'pc-1',
    code: 'SPRING2025',
    discountLabel: '−15%',
    redemptions: 842,
    limit: 5000,
    status: 'Активен',
    validUntil: '2025-06-01T00:00:00.000Z',
  },
  {
    id: 'pc-2',
    code: 'FIRST20',
    discountLabel: '−20% первый заказ',
    redemptions: 1203,
    limit: null,
    status: 'Активен',
    validUntil: null,
  },
  {
    id: 'pc-3',
    code: 'PARTNER-Q2',
    discountLabel: 'Фикс 500 ₽',
    redemptions: 0,
    limit: 200,
    status: 'План',
    validUntil: '2025-04-15T00:00:00.000Z',
  },
];

const PROMO_COLLECTIONS: PromoCollectionRow[] = [
  {
    id: 'pmc-1',
    name: 'Выходные на воде',
    slug: 'weekend-water',
    placements: 3,
    status: 'Активна',
    updatedAt: '2025-03-18T12:00:00.000Z',
  },
  {
    id: 'pmc-2',
    name: 'Майские праздники',
    slug: 'may-holidays',
    placements: 1,
    status: 'Черновик',
    updatedAt: '2025-03-10T09:30:00.000Z',
  },
];

const UPSELL_RULES: UpsellRuleRow[] = [
  {
    id: 'up-1',
    title: 'Страховка к билету',
    trigger: 'Корзина: категория «прогулки»',
    offer: 'Доп. услуга «отмена»',
    priority: 10,
    status: 'Вкл',
  },
  {
    id: 'up-2',
    title: 'Подарочный сертификат',
    trigger: 'Checkout, сумма > 5000 ₽',
    offer: 'Сертификат со скидкой',
    priority: 5,
    status: 'Вкл',
  },
  {
    id: 'up-3',
    title: 'Соседнее событие',
    trigger: 'Страница события',
    offer: 'Блок «рядом по времени»',
    priority: 1,
    status: 'Выкл',
  },
];

export function getMockPromoCodes(): PromoCodeRow[] {
  return [...PROMO_CODES];
}

export function getMockPromoCollections(): PromoCollectionRow[] {
  return [...PROMO_COLLECTIONS];
}

export function getMockUpsellRules(): UpsellRuleRow[] {
  return [...UPSELL_RULES];
}
