import type { MediaImageUploadResult, MediaUploadAdapter } from '@daibilet/shared';

const API_BASE = '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('supplier_token');
}

export async function uploadSupplierMediaImages(files: File[]): Promise<MediaImageUploadResult[]> {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const token = getToken();
  const res = await fetch(`${API_BASE}/supplier/media/images`, {
    method: 'POST',
    body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<MediaImageUploadResult[]>;
}

export async function deleteSupplierMediaImages(publicIds: string[]): Promise<void> {
  if (!publicIds.length) return;
  const token = getToken();
  const res = await fetch(`${API_BASE}/supplier/media/images`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ publicIds }),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error((err as { message?: string }).message || `HTTP ${res.status}`);
  }
}

export function createSupplierMediaUploadAdapter(): MediaUploadAdapter {
  return {
    uploadFiles: uploadSupplierMediaImages,
    deleteByPublicIds: deleteSupplierMediaImages,
  };
}
