import { api } from '@/lib/api';
import type { SeoMetaResponse } from '@/lib/api.types';

/** Тип сущности для SEO */
export type SeoEntityType = 'EVENT' | 'CITY' | 'TAG' | 'ARTICLE' | 'VENUE';

/**
 * Загружает SEO мета-данные с backend.
 * Используется в generateMetadata для страниц событий, городов, venue, статей.
 */
export async function getSeoMeta(
  entityType: SeoEntityType,
  entityId: string,
): Promise<SeoMetaResponse | null> {
  return api.getSeoMeta(entityType, entityId);
}
