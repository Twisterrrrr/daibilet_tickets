import { adminApi } from '@/api/client';
import type { AdminEventSessionRow } from '@/components/events/ScheduleTab';

export type CreateSessionDto = {
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
};

export type UpdateSessionDto = {
  startsAt?: string;
  endsAt?: string | null;
  capacity?: number | null;
};

export async function createSession(eventId: string, dto: CreateSessionDto) {
  return adminApi.post<AdminEventSessionRow>(`/admin/events/${eventId}/sessions`, dto);
}

export async function updateSession(sessionId: string, dto: UpdateSessionDto) {
  return adminApi.patch<AdminEventSessionRow>(`/admin/sessions/${sessionId}`, dto);
}

export async function stopSession(sessionId: string, reason?: string) {
  return adminApi.post<AdminEventSessionRow>(`/admin/sessions/${sessionId}/stop`, reason ? { reason } : {});
}

export async function cancelSession(sessionId: string, reason?: string) {
  return adminApi.post<AdminEventSessionRow>(`/admin/sessions/${sessionId}/cancel`, reason ? { reason } : {});
}

export async function deleteSession(sessionId: string) {
  return adminApi.delete<{ ok: true }>(`/admin/sessions/${sessionId}`);
}

