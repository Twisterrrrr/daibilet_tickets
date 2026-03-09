import { adminApi } from './client';

export interface PromoBlock {
  id: string;
  slug: string;
  title: string;
  description: string;
  href: string | null;
  contentMode?: string;
  collectionId?: string | null;
  collection?: { id: string; slug: string; title: string } | null;
  selectionMode: string;
  contentType: string;
  citySlug?: string | null;
  categorySlug?: string | null;
  tagSlugs: string[];
  isKids?: boolean | null;
  isIndoor?: boolean | null;
  autoSort?: string | null;
  autoLimit?: number | null;
  iconSource: string;
  iconKey?: string | null;
  iconSvg?: string | null;
  bgMode: string;
  bgColor?: string | null;
  gradientFrom?: string | null;
  gradientTo?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  priority: number;
  sortOrder: number;
  isActive: boolean;
  targetCitySlugs?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PromoBlockFormData {
  slug: string;
  title: string;
  description: string;
  href?: string;
  contentMode?: string;
  collectionId?: string | null;
  selectionMode?: string;
  contentType?: string;
  citySlug?: string;
  categorySlug?: string;
  tagSlugs?: string[];
  isKids?: boolean;
  isIndoor?: boolean;
  autoSort?: string;
  autoLimit?: number;
  iconSource?: string;
  iconKey?: string;
  iconSvg?: string;
  bgMode?: string;
  bgColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  startsAt?: string;
  endsAt?: string;
  priority?: number;
  sortOrder?: number;
  isActive?: boolean;
  targetCitySlugs?: string[];
}

export const promoBlocksApi = {
  list: () => adminApi.get<PromoBlock[]>('/admin/promo-blocks'),
  get: (id: string) => adminApi.get<PromoBlock>(`/admin/promo-blocks/${id}`),
  create: (data: PromoBlockFormData) =>
    adminApi.post<PromoBlock>('/admin/promo-blocks', data),
  update: (id: string, data: Partial<PromoBlockFormData>) =>
    adminApi.patch<PromoBlock>(`/admin/promo-blocks/${id}`, data),
  delete: (id: string) => adminApi.delete(`/admin/promo-blocks/${id}`),
};
