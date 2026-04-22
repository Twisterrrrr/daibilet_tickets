import { adminApi } from '@/api/client';

export type RoutePointTargetType = 'VENUE' | 'EVENT';

export type AdminEventRoutePointDto = {
  id: string;
  order: number;
  targetType: RoutePointTargetType;
  venueId: string | null;
  eventId: string | null;
  titleOverride: string | null;
  description: string | null;
  durationMinutes: number | null;
  isOptional: boolean;
  target: {
    id: string;
    type: 'VENUE' | 'EVENT';
    title: string;
    slug: string;
    cityId?: string | null;
    cityName?: string | null;
    coverImageUrl?: string | null;
    isPublished?: boolean | null;
    lifecycleStatus?: string | null;
  };
};

export type AdminRouteWarning = {
  code: 'CITY_MISMATCH' | 'TARGET_UNPUBLISHED' | 'TARGET_ARCHIVED' | 'TARGET_MISSING_PRIMARY_IMAGE';
  message?: string;
};

export type AdminEventRouteDto = {
  id: string;
  eventId: string;
  title: string | null;
  summary: string | null;
  isPublished: boolean;
  version: number;
  updatedAt: string;
  points: AdminEventRoutePointDto[];
  warnings: AdminRouteWarning[];
};

export type PutEventRouteBody = {
  title?: string | null;
  summary?: string | null;
  isPublished?: boolean;
  version?: number;
  points: Array<{
    id?: string;
    order: number;
    targetType: RoutePointTargetType;
    venueId?: string | null;
    eventId?: string | null;
    titleOverride?: string | null;
    description?: string | null;
    durationMinutes?: number | null;
    isOptional?: boolean;
  }>;
};

export async function fetchAdminEventRoute(eventId: string): Promise<AdminEventRouteDto | null> {
  const r = await adminApi.get<AdminEventRouteDto | null>(`/admin/events/${eventId}/route`);
  return r ?? null;
}

export async function putAdminEventRoute(eventId: string, body: PutEventRouteBody): Promise<AdminEventRouteDto> {
  return adminApi.put<AdminEventRouteDto>(`/admin/events/${eventId}/route`, body);
}

export async function deleteAdminEventRoute(eventId: string): Promise<{ ok: true }> {
  return adminApi.delete<{ ok: true }>(`/admin/events/${eventId}/route`);
}
