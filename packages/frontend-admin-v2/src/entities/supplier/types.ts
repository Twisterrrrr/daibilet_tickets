export type SupplierStatus = 'active' | 'onboarding' | 'suspended';

export interface SupplierEntity {
  id: string;
  name: string;
  status: SupplierStatus;
  eventsCount: number;
  catalogQuality: number;
  operatorLabel: string;
  createdAt: string;
  updatedAt: string;
}

/** Карточка поставщика (мок / GET /admin/suppliers/:id). */
export interface SupplierDetail extends SupplierEntity {
  legalName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  ordersCount30d: number;
}
