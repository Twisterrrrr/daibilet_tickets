import type { MediaImageUploadResult, MediaUploadAdapter } from '@daibilet/shared';

import { getToken } from '@/lib/auth';

import { adminApi } from './client';

const BASE = '/api/v1';

export async function uploadAdminMediaImages(files: File[]): Promise<MediaImageUploadResult[]> {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const token = getToken();
  const res = await fetch(`${BASE}/admin/media/images`, {
    method: 'POST',
    body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<MediaImageUploadResult[]>;
}

export async function deleteAdminMediaImages(publicIds: string[]): Promise<void> {
  if (!publicIds.length) return;
  await adminApi.delete('/admin/media/images', { publicIds });
}

export function createAdminMediaUploadAdapter(): MediaUploadAdapter {
  return {
    uploadFiles: uploadAdminMediaImages,
    deleteByPublicIds: deleteAdminMediaImages,
  };
}
