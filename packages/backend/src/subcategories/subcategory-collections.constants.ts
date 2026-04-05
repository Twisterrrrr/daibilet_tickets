/**
 * Пороги для SEO-лендингов и превью подборок (настраиваются через env без смены контракта API).
 */
function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw === '') return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const SUBCATEGORY_COLLECTION_THRESHOLDS = {
  /** Минимум событий для публикации публичного SEO-лендинга */
  landingMinEvents: parsePositiveInt(process.env.SUBCATEGORY_LANDING_MIN_EVENTS, 3),
  /** Минимум площадок для публикации публичного SEO-лендинга (entityKind=VENUE) */
  landingMinVenues: parsePositiveInt(process.env.SUBCATEGORY_LANDING_MIN_VENUES, 2),
  /** Минимум элементов, чтобы блок «превью» считался содержательным */
  minPreviewItems: parsePositiveInt(process.env.SUBCATEGORY_COLLECTION_MIN_PREVIEW, 3),
} as const;

/** TTL кэша подборок/лендингов по подкатегории (сек), кламп 60–300 */
export function subcategoryCollectionCacheTtlSec(): number {
  const raw = process.env.SUBCATEGORY_COLLECTION_CACHE_TTL_SEC;
  const n = raw != null && raw !== '' ? parseInt(raw, 10) : 120;
  if (!Number.isFinite(n)) return 120;
  return Math.min(300, Math.max(60, n));
}
