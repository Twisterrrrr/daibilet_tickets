import { api } from '@/shared/api/client';
import type { SyncEnqueueDto, SyncProgressDto, SyncQueueDetailsDto, SyncStatusDto } from '@/modules/import-sources/types';

export async function getSyncStatus(): Promise<SyncStatusDto> {
  return api<SyncStatusDto>('/admin/settings/sync-status');
}

export async function getSyncQueueDetails(): Promise<SyncQueueDetailsDto> {
  return api<SyncQueueDetailsDto>('/admin/ops/queues/sync');
}

export async function enqueueFullSync(): Promise<SyncEnqueueDto> {
  return api<SyncEnqueueDto>('/admin/settings/ops/sync/full', { method: 'POST' });
}

export async function enqueueTepSync(): Promise<SyncEnqueueDto> {
  return api<SyncEnqueueDto>('/admin/settings/ops/sync/tep', { method: 'POST' });
}

export async function enqueueTcSync(mode: 'fast' | 'full' = 'fast'): Promise<SyncEnqueueDto> {
  return api<SyncEnqueueDto>(`/admin/settings/ops/sync/tc?mode=${mode}`, { method: 'POST' });
}

export async function getFullSyncProgress(jobId?: string): Promise<SyncProgressDto> {
  const qs = jobId ? `?jobId=${encodeURIComponent(jobId)}` : '';
  return api<SyncProgressDto>(`/admin/settings/ops/sync/progress${qs}`);
}

