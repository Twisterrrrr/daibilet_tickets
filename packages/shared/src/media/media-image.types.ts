/**
 * Единая модель элемента изображения для UI (admin/supplier).
 * В БД сохраняются в основном url; publicId нужен для удаления в Cloudinary.
 */
export type MediaImageItemStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

export interface MediaImageItem {
  /** Локальный ключ для React (upload session) */
  id?: string;
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  bytes?: number;
  originalFilename?: string;
  alt?: string;
  sortOrder?: number;
  isPrimary?: boolean;
  status?: MediaImageItemStatus;
  errorMessage?: string;
}

/** Ответ POST /admin/media/images и POST /supplier/media/images (один элемент массива). */
export interface MediaImageUploadResult {
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  originalFilename: string;
  provider: 'CLOUDINARY';
  publicId: string;
}

function newLocalId(): string {
  return `mi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function mapUploadResultToItem(r: MediaImageUploadResult, sortOrder = 0): MediaImageItem {
  return {
    id: newLocalId(),
    url: r.url,
    publicId: r.publicId,
    width: r.width,
    height: r.height,
    bytes: r.bytes,
    originalFilename: r.originalFilename,
    sortOrder,
    status: 'uploaded',
  };
}

/** Legacy: только URL без publicId (удаление из Cloudinary недоступно). */
export function legacyUrlToItem(url: string, index: number): MediaImageItem {
  return {
    id: url || `empty-${index}`,
    url,
    sortOrder: index,
    status: 'uploaded',
  };
}

/** Адаптер загрузки/удаления для встраивания в формы (admin/supplier передают свою реализацию). */
export interface MediaUploadAdapter {
  uploadFiles: (files: File[]) => Promise<MediaImageUploadResult[]>;
  deleteByPublicIds?: (publicIds: string[]) => Promise<void>;
}

/** Для сохранения в Prisma: массив URL галереи. */
export function galleryItemsToUrls(items: MediaImageItem[]): string[] {
  return items.map((x) => x.url).filter(Boolean);
}

/** Cover: первый элемент с isPrimary или первый в списке. */
export function pickPrimaryUrl(items: MediaImageItem[]): string | null {
  const primary = items.find((x) => x.isPrimary);
  if (primary?.url) return primary.url;
  return items[0]?.url ?? null;
}
