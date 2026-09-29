import { api } from '@/shared/api/client';
import type { EventDetailDto, EventListItemDto, Paginated } from '@/modules/events/types';

export type ListEventsQuery = {
  page?: number;
  limit?: number;
  lite?: boolean;
  search?: string;
  active?: 'true' | 'false';
  city?: string;
  source?: string;
  hidden?: 'true' | 'false';
  isPast?: 'true' | 'false';
  isArchived?: 'true' | 'false';
  missingImage?: 'true';
  hasFutureSessions?: 'true' | 'false';
  needsAttention?: 'true' | 'false';
  readyToPublish?: 'true' | 'false';
  purchaseReadiness?: 'READY' | 'NOT_READY' | 'MISSING';
};

export async function listEvents(query: ListEventsQuery): Promise<Paginated<EventListItemDto>> {
  const qs = new URLSearchParams();
  qs.set('page', String(query.page ?? 1));
  qs.set('limit', String(query.limit ?? 50));
  if (query.lite) qs.set('lite', '1');
  if (query.search) qs.set('search', query.search);
  if (query.active) qs.set('active', query.active);
  if (query.city) qs.set('city', query.city);
  if (query.source) qs.set('source', query.source);
  if (query.hidden) qs.set('hidden', query.hidden);
  if (query.isPast) qs.set('isPast', query.isPast);
  if (query.isArchived) qs.set('isArchived', query.isArchived);
  if (query.missingImage) qs.set('missingImage', query.missingImage);
  if (query.hasFutureSessions) qs.set('hasFutureSessions', query.hasFutureSessions);
  if (query.needsAttention) qs.set('needsAttention', query.needsAttention);
  if (query.readyToPublish) qs.set('readyToPublish', query.readyToPublish);
  if (query.purchaseReadiness) qs.set('purchaseReadiness', query.purchaseReadiness);
  return api<Paginated<EventListItemDto>>(`/admin/events?${qs.toString()}`);
}

export async function getEvent(id: string): Promise<EventDetailDto> {
  return api<EventDetailDto>(`/admin/events/${id}`);
}

export async function patchEventHide(id: string, body: { isHidden: boolean }): Promise<unknown> {
  return api(`/admin/events/${encodeURIComponent(id)}/hide`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function patchEventActivation(id: string, body: { isActive: boolean }): Promise<{ id: string; isActive: boolean }> {
  return api<{ id: string; isActive: boolean }>(`/admin/events/${encodeURIComponent(id)}/activation`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function patchEventMedia(id: string, body: { imageUrl?: string | null; galleryUrls?: string[] }): Promise<{ ok: true }> {
  return api<{ ok: true }>(`/admin/events/${encodeURIComponent(id)}/media`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** PATCH `/admin/events/:id/override` — частичное обновление override (в т.ч. `category`). */
export async function patchEventOverride(
  id: string,
  body: { category?: string | null } & Record<string, unknown>,
): Promise<unknown> {
  return api(`/admin/events/${encodeURIComponent(id)}/override`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** POST `/admin/events/:id/subcategories` — PRIMARY + SECONDARY по кодам справочника. */
export async function assignEventSubcategories(
  id: string,
  body: { primaryCode: string; secondaryCodes?: string[] },
): Promise<unknown> {
  return api(`/admin/events/${encodeURIComponent(id)}/subcategories`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** PUT `/admin/events/:id/tags` — слои STRUCTURAL и POPULAR по slug. */
export async function setEventTags(
  id: string,
  body: { structuralTags?: string[]; popularTags?: string[] },
): Promise<unknown> {
  return api(`/admin/events/${encodeURIComponent(id)}/tags`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
