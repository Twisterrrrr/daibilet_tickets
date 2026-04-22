import { adminApi } from '@/api/client';

export type PromoBlockRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  href: string | null;
  contentMode: string;
  collectionId: string | null;
  selectionMode?: string | null;
  contentType?: string | null;
  citySlug?: string | null;
  categorySlug?: string | null;
  tagSlugs?: string[];
  targetCitySlugs?: string[];
  isKids?: boolean | null;
  isIndoor?: boolean | null;
  autoSort?: string | null;
  autoLimit?: number | null;
  isActive: boolean;
  priority: number;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
  createdAt: string;
};

export type CreatePromoBlockInput = {
  slug: string;
  title: string;
  description: string;
  href?: string;
  contentMode?: string;
  collectionId?: string;
  selectionMode?: string;
  contentType?: string;
  citySlug?: string;
  categorySlug?: string;
  tagSlugs?: string[];
  targetCitySlugs?: string[];
  isKids?: boolean;
  isIndoor?: boolean;
  autoSort?: string;
  autoLimit?: number;
  startsAt?: string;
  endsAt?: string;
  priority?: number;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdatePromoBlockInput = Partial<CreatePromoBlockInput>;

export async function fetchAdminPromoBlocks() {
  return adminApi.get<PromoBlockRow[]>('/admin/promo-blocks');
}

export async function createAdminPromoBlock(data: CreatePromoBlockInput) {
  return adminApi.post<PromoBlockRow>('/admin/promo-blocks', data);
}

export async function patchAdminPromoBlock(id: string, data: UpdatePromoBlockInput) {
  return adminApi.patch<PromoBlockRow>(`/admin/promo-blocks/${encodeURIComponent(id)}`, data);
}

export async function deleteAdminPromoBlock(id: string) {
  return adminApi.delete<{ success: true }>(`/admin/promo-blocks/${encodeURIComponent(id)}`);
}

