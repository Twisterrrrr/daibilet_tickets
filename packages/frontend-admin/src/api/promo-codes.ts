import { adminApi } from './client';

export interface PromoCode {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  operatorId?: string | null;
  eventId?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  maxUses?: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCodeFormData {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  operatorId?: string | null;
  eventId?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  maxUses?: number | null;
  isActive?: boolean;
}

export const promoCodesApi = {
  list: () => adminApi.get<PromoCode[]>('/admin/promo-codes'),
  get: (id: string) => adminApi.get<PromoCode>(`/admin/promo-codes/${id}`),
  create: (data: PromoCodeFormData) => adminApi.post<PromoCode>('/admin/promo-codes', data),
  update: (id: string, data: Partial<PromoCodeFormData>) =>
    adminApi.patch<PromoCode>(`/admin/promo-codes/${id}`, data),
  delete: (id: string) => adminApi.delete(`/admin/promo-codes/${id}`),
};

