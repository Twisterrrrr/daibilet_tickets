import type { SupplierEntity } from '@/entities/supplier/types';

const SUPPLIERS: SupplierEntity[] = [
  {
    id: 'sup-1',
    name: 'СПБ Ривер Тур',
    status: 'active',
    eventsCount: 12,
    catalogQuality: 93,
    operatorLabel: 'Оператор водных маршрутов',
    createdAt: '2024-01-10T10:00:00.000Z',
    updatedAt: '2025-03-20T15:00:00.000Z',
  },
  {
    id: 'sup-2',
    name: 'Дайбилет Экскурсии',
    status: 'active',
    eventsCount: 28,
    catalogQuality: 90,
    operatorLabel: 'Собственный контур',
    createdAt: '2023-08-01T08:00:00.000Z',
    updatedAt: '2025-03-22T09:30:00.000Z',
  },
  {
    id: 'sup-3',
    name: 'RoofSPB',
    status: 'onboarding',
    eventsCount: 4,
    catalogQuality: 72,
    operatorLabel: 'Экстрим / смотровые',
    createdAt: '2025-02-15T12:00:00.000Z',
    updatedAt: '2025-03-12T11:00:00.000Z',
  },
  {
    id: 'sup-4',
    name: 'Музейные ночи РФ',
    status: 'active',
    eventsCount: 19,
    catalogQuality: 88,
    operatorLabel: 'Федеральная сеть',
    createdAt: '2024-04-20T09:00:00.000Z',
    updatedAt: '2025-03-19T07:45:00.000Z',
  },
];

export function getMockSuppliers(): SupplierEntity[] {
  return [...SUPPLIERS];
}
