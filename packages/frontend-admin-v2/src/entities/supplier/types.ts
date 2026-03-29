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
