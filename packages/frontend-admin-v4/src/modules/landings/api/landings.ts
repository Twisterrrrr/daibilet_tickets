import { api } from '@/shared/api/client';
import type {
  LandingDetailDto,
  LandingListItemDto,
  LandingResolvedEventsDto,
  LandingSeoAuditResponseDto,
  Paginated,
} from '@/modules/landings/types';

export type ListLandingsQuery = {
  page?: number;
  limit?: number;
  lite?: boolean;
  search?: string;
  city?: string;
  status?: string;
  landingType?: string;
};

export type CreateLandingBody = {
  slug: string;
  title: string;
  subtitle?: string | null;
  landingType: 'CITY' | 'MULTI_CITY';
  cityId?: string | null;
  parentLandingId?: string | null;
  templateType?: string | null;
  filterTag?: string | null;
  filterTagId?: string | null;
  additionalFilters?: unknown;
  seasonalPayload?: unknown;
  metaTitle?: string | null;
  metaDescription?: string | null;
  seoH1?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
  isActive?: boolean;
  isIndexable?: boolean;
  status?: string | null;
};

export type PatchLandingBody = Partial<CreateLandingBody> & { version?: number };

export async function listLandings(query: ListLandingsQuery): Promise<Paginated<LandingListItemDto>> {
  const qs = new URLSearchParams();
  qs.set('page', String(query.page ?? 1));
  qs.set('limit', String(query.limit ?? 50));
  if (query.lite) qs.set('lite', '1');
  if (query.search) qs.set('search', query.search);
  if (query.city) qs.set('city', query.city);
  if (query.status) qs.set('status', query.status);
  if (query.landingType) qs.set('landingType', query.landingType);
  return api<Paginated<LandingListItemDto>>(`/admin/landings?${qs.toString()}`);
}

export async function getLanding(id: string): Promise<LandingDetailDto> {
  return api<LandingDetailDto>(`/admin/landings/${id}`);
}

export async function getLandingResolvedEvents(id: string): Promise<LandingResolvedEventsDto> {
  return api<LandingResolvedEventsDto>(`/admin/landings/${encodeURIComponent(id)}/resolved-events`);
}

export async function getLandingSeoAudit(id: string): Promise<LandingSeoAuditResponseDto> {
  return api<LandingSeoAuditResponseDto>(`/admin/landings/${encodeURIComponent(id)}/seo-audit`);
}

export async function createLanding(body: CreateLandingBody): Promise<LandingDetailDto> {
  return api<LandingDetailDto>(`/admin/landings`, { method: 'POST', body: JSON.stringify(body) });
}

export async function patchLanding(id: string, body: PatchLandingBody): Promise<LandingDetailDto> {
  return api<LandingDetailDto>(`/admin/landings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export type CreateLandingBlockBody = {
  type: string;
  variant?: string | null;
  title?: string | null;
  subtitle?: string | null;
  eyebrow?: string | null;
  body?: string | null;
  payload?: Record<string, unknown> | null;
  richTextJson?: Record<string, unknown> | null;
  assetUrl?: string | null;
  mobileAssetUrl?: string | null;
  isEnabled?: boolean;
  sortOrder?: number;
  visibilityRules?: Record<string, unknown> | null;
};

export type PatchLandingBlockBody = Partial<CreateLandingBlockBody>;export async function createLandingBlock(landingId: string, body: CreateLandingBlockBody): Promise<unknown> {
  return api(`/admin/landings/${encodeURIComponent(landingId)}/blocks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}export async function patchLandingBlock(landingId: string, blockId: string, body: PatchLandingBlockBody): Promise<unknown> {
  return api(`/admin/landings/${encodeURIComponent(landingId)}/blocks/${encodeURIComponent(blockId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteLandingBlock(landingId: string, blockId: string): Promise<unknown> {
  return api(`/admin/landings/${encodeURIComponent(landingId)}/blocks/${encodeURIComponent(blockId)}`, {
    method: 'DELETE',
  });
}export async function reorderLandingBlocks(landingId: string, orderedIds: string[]): Promise<unknown> {
  return api(`/admin/landings/${encodeURIComponent(landingId)}/blocks/reorder`, {
    method: 'POST',
    body: JSON.stringify({ orderedIds }),
  });
}
