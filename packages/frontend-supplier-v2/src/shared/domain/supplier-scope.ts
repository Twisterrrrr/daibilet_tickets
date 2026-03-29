/**
 * Префиксы API для кабинета поставщика.
 * Для будущего выделения общих модулей с админкой: рядом появится `admin-scope.ts`,
 * доменные типы совпадают там, где совпадают DTO бэкенда.
 */
export const SUPPLIER_API = {
  dashboard: '/supplier/dashboard',
  events: '/supplier/events',
  event: (id: string) => `/supplier/events/${id}`,
  orders: '/supplier/orders',
  orderConfirm: (id: string) => `/supplier/orders/${id}/confirm`,
  orderReject: (id: string) => `/supplier/orders/${id}/reject`,
} as const;
