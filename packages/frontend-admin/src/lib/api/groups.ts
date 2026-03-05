import { adminApi } from '@/api/client';

export type EventGroupItem = {
  id: string;
  title: string;
  cityName: string;
  source: string;
  isActive: boolean;
  isHidden: boolean;
};

export type EventGroupResponse = {
  groupingKey: string | null;
  isCanonical: boolean;
  canonicalEventId: string | null;
  items: EventGroupItem[];
};

export type EventSearchResult = {
  id: string;
  title: string;
  cityName: string;
};

export async function getEventGroup(eventId: string): Promise<EventGroupResponse> {
  return adminApi.get<EventGroupResponse>(`/admin/events/${eventId}/group`);
}

export async function setEventGroupingKey(eventId: string, groupingKey: string): Promise<void> {
  await adminApi.patch(`/admin/events/${eventId}/group`, { groupingKey });
}

export async function clearEventGrouping(eventId: string): Promise<void> {
  await adminApi.delete(`/admin/events/${eventId}/group`);
}

export async function makeEventCanonical(eventId: string): Promise<void> {
  await adminApi.post(`/admin/events/${eventId}/group/make-canonical`, {});
}

export async function searchEvents(query: string): Promise<EventSearchResult[]> {
  if (!query.trim()) return [];
  return adminApi.get<EventSearchResult[]>(`/admin/events/search?query=${encodeURIComponent(query.trim())}`);
}

