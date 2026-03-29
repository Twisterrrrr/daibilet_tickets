import type { OrderEntity } from '@/entities/order/types';

const ORDERS: OrderEntity[] = [
  {
    id: 'ord-1',
    code: 'DB-104821',
    status: 'paid',
    amount: 5400,
    currency: 'RUB',
    buyerName: 'Анна Смирнова',
    buyerEmail: 'anna.smirnova@example.com',
    eventTitle: 'Речная прогулка по Неве и каналам',
    supplierName: 'СПБ Ривер Тур',
    createdAt: '2025-03-21T09:12:00.000Z',
    updatedAt: '2025-03-21T09:13:00.000Z',
  },
  {
    id: 'ord-2',
    code: 'DB-104822',
    status: 'pending',
    amount: 3200,
    currency: 'RUB',
    buyerName: 'Илья Кузнецов',
    buyerEmail: 'i.kuznetsov@example.com',
    eventTitle: 'Эрмитаж без очереди: малый групповой тур',
    supplierName: 'Дайбилет Экскурсии',
    createdAt: '2025-03-21T10:40:00.000Z',
    updatedAt: '2025-03-21T10:40:00.000Z',
  },
  {
    id: 'ord-3',
    code: 'DB-104800',
    status: 'refunded',
    amount: 1800,
    currency: 'RUB',
    buyerName: 'Елена Волкова',
    buyerEmail: 'elena.v@example.com',
    eventTitle: 'Ночной дворец Артиллерийского музея',
    supplierName: 'Музейные ночи РФ',
    createdAt: '2025-03-18T14:00:00.000Z',
    updatedAt: '2025-03-19T08:30:00.000Z',
  },
  {
    id: 'ord-4',
    code: 'DB-104798',
    status: 'cancelled',
    amount: 4500,
    currency: 'RUB',
    buyerName: 'Михаил Петров',
    buyerEmail: 'm.petrov@example.com',
    eventTitle: 'Крыши Петербурга: закатный маршрут',
    supplierName: 'RoofSPB',
    createdAt: '2025-03-17T19:05:00.000Z',
    updatedAt: '2025-03-17T19:20:00.000Z',
  },
];

export function getMockOrders(): OrderEntity[] {
  return [...ORDERS];
}
