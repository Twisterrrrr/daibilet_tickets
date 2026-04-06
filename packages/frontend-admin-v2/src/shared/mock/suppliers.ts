import type { SupplierDetail } from '@/entities/supplier/types';

const SUPPLIERS: SupplierDetail[] = [
  {
    id: 'sup-1',
    name: 'СПБ Ривер Тур',
    status: 'active',
    eventsCount: 12,
    catalogQuality: 93,
    operatorLabel: 'Оператор водных маршрутов',
    legalName: 'ООО «СПБ Ривер Тур»',
    contactEmail: 'ops@river-tour.example.com',
    contactPhone: '+7 812 ***-**-01',
    notes: 'Стабильные SLA по речным маршрутам.',
    ordersCount30d: 184,
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
    legalName: 'ООО «Дайбилет Экскурсии»',
    contactEmail: 'partner@daibilet.example.com',
    contactPhone: '+7 800 ***-**-00',
    notes: 'Основной контур экскурсий.',
    ordersCount30d: 612,
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
    legalName: 'ИП Иванов А.А.',
    contactEmail: 'roof@example.com',
    contactPhone: '+7 921 ***-**-77',
    notes: 'Онбординг: дозаполнить медиа и расписание.',
    ordersCount30d: 9,
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
    legalName: 'АНО «Музейные ночи»',
    contactEmail: 'coord@museum-nights.example.com',
    contactPhone: '+7 495 ***-**-22',
    notes: '',
    ordersCount30d: 240,
    createdAt: '2024-04-20T09:00:00.000Z',
    updatedAt: '2025-03-19T07:45:00.000Z',
  },
];

export function getMockSuppliers(): SupplierDetail[] {
  return [...SUPPLIERS];
}

export function getMockSupplierById(id: string): SupplierDetail | undefined {
  return SUPPLIERS.find((s) => s.id === id);
}
