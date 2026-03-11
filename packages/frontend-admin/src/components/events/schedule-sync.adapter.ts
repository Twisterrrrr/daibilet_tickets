import { adminApi } from '@/api/client';
import type { AdminEventSessionRow } from '@/components/events/ScheduleTab';
import type { EventWizardDraft, EventWizardScheduleDraft } from '@daibilet/shared-ui';
import { batchCreateSessions, stopSession } from '@/api/adminEventSessionsMutations';

type AdminEventSessionsRange = {
  eventId: string;
  from: string;
  to: string;
  cancelledCount: number;
  rows: AdminEventSessionRow[];
};

export type ScheduleExtraReason = 'sold' | 'imported' | 'manual' | 'extra';

export interface ScheduleSyncPlan {
  toCreate: { startsAt: string }[];
  toKeep: { sessionId: string; startsAt: string }[];
  extraExisting: { sessionId: string; startsAt: string; reason: ScheduleExtraReason }[];
  summary: {
    createCount: number;
    keepCount: number;
    preserveCount: number;
    stopCandidatesCount: number;
  };
}

function normalizeIso(iso: string): string {
  if (!iso) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString();
}

export function buildDesiredStarts(schedule: EventWizardScheduleDraft): string[] {
  const base = new Set(schedule.startsAtList.map(normalizeIso));

  // Учесть переносы: from → to
  for (const m of schedule.exceptions.movedStartsAt) {
    const from = normalizeIso(m.from);
    const to = normalizeIso(m.to);
    if (base.has(from)) {
      base.delete(from);
    }
    base.add(to);
  }

  // Учесть удаления
  for (const removed of schedule.exceptions.removedStartsAt) {
    base.delete(normalizeIso(removed));
  }

  return Array.from(base.values()).sort();
}

async function fetchAllSessions(eventId: string): Promise<AdminEventSessionRow[]> {
  // Берём будущие и отменённые сеансы в разумном окне: сегодня → +365 дней.
  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const toDate = new Date(today);
  toDate.setFullYear(toDate.getFullYear() + 1);
  const to = toDate.toISOString().slice(0, 10);

  const qs = new URLSearchParams();
  qs.set('from', from);
  qs.set('to', to);
  qs.set('includeCancelled', '1');
  const q = `?${qs.toString()}`;

  const res = await adminApi.get<AdminEventSessionsRange>(`/admin/events/${eventId}/sessions${q}`);
  return res.rows ?? [];
}

export function buildScheduleSyncPlan(
  draft: EventWizardDraft,
  existingSessions: AdminEventSessionRow[],
): ScheduleSyncPlan {
  const desired = buildDesiredStarts(draft.schedule);
  const _desiredSet = new Set(desired);

  const byStartsAt = new Map<string, AdminEventSessionRow[]>();
  for (const s of existingSessions) {
    const key = normalizeIso(s.startsAt);
    const list = byStartsAt.get(key) ?? [];
    list.push(s);
    byStartsAt.set(key, list);
  }

  const toCreate: { startsAt: string }[] = [];
  const toKeep: { sessionId: string; startsAt: string }[] = [];

  for (const startsAt of desired) {
    const list = byStartsAt.get(startsAt);
    if (!list || list.length === 0) {
      toCreate.push({ startsAt });
      continue;
    }
    // Есть хотя бы один сеанс с таким startsAt → считаем его сохранённым.
    const s = list[0]!;
    toKeep.push({ sessionId: s.id, startsAt });
  }

  const desiredStarts = new Set(desired);

  const extraExisting: { sessionId: string; startsAt: string; reason: ScheduleExtraReason }[] = [];

  for (const s of existingSessions) {
    const key = normalizeIso(s.startsAt);
    if (desiredStarts.has(key)) continue;

    let reason: ScheduleExtraReason = 'extra';
    if (s.soldCount > 0) {
      reason = 'sold';
    } else if (s.lockReason === 'IMPORTED') {
      reason = 'imported';
    } else if (s.locked || s.isCancelled) {
      reason = 'manual';
    }

    extraExisting.push({ sessionId: s.id, startsAt: key, reason });
  }

  const preserveCount = extraExisting.filter((e) => e.reason !== 'extra').length;
  const stopCandidatesCount = extraExisting.filter((e) => e.reason === 'extra').length;

  return {
    toCreate,
    toKeep,
    extraExisting,
    summary: {
      createCount: toCreate.length,
      keepCount: toKeep.length,
      preserveCount,
      stopCandidatesCount,
    },
  };
}

export async function getScheduleSyncPlan(eventId: string, draft: EventWizardDraft): Promise<ScheduleSyncPlan> {
  const sessions = await fetchAllSessions(eventId);
  return buildScheduleSyncPlan(draft, sessions);
}

export async function applyScheduleSyncPlan(eventId: string, draft: EventWizardDraft): Promise<ScheduleSyncPlan> {
  const sessions = await fetchAllSessions(eventId);
  const plan = buildScheduleSyncPlan(draft, sessions);

  // Phase 21: применяем только безопасные изменения.
  const slotsToCreate = plan.toCreate;
  const extraForStop = plan.extraExisting.filter((e) => e.reason === 'extra');

  if (slotsToCreate.length > 0) {
    await batchCreateSessions(
      eventId,
      slotsToCreate.map((s) => ({
        startsAt: s.startsAt,
      })),
    );
  }

  for (const e of extraForStop) {
    await stopSession(e.sessionId);
  }

  // Вернуть обновлённый план после применения.
  const newSessions = await fetchAllSessions(eventId);
  return buildScheduleSyncPlan(draft, newSessions);
}


