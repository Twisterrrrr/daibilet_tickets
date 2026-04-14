import { EventSource } from '@/prisma-client';

/** Контракт queryConfig для AUTO/HYBRID (валидируется на backend). */
export type CollectionQueryConfig = {
  cityId?: string;
  subcategoryIds?: string[];
  tags?: string[];
  priceMax?: number;
  isToday?: boolean;
  source?: 'TICKETSCLOUD' | 'TEPLOHOD';
  limit?: number;
  sort?: 'POPULAR' | 'PRICE_ASC' | 'SOONEST';
};

const SORTS = new Set(['POPULAR', 'PRICE_ASC', 'SOONEST']);
const SOURCES = new Set(['TICKETSCLOUD', 'TEPLOHOD']);

export function parseCollectionQueryConfig(raw: unknown): CollectionQueryConfig | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('INVALID_QUERY_CONFIG');
  const o = raw as Record<string, unknown>;
  const cfg: CollectionQueryConfig = {};

  if (o.cityId !== undefined) {
    if (typeof o.cityId !== 'string') throw new Error('INVALID_QUERY_CONFIG');
    cfg.cityId = o.cityId;
  }
  if (o.subcategoryIds !== undefined) {
    if (!Array.isArray(o.subcategoryIds) || !o.subcategoryIds.every((x) => typeof x === 'string')) {
      throw new Error('INVALID_QUERY_CONFIG');
    }
    cfg.subcategoryIds = o.subcategoryIds;
  }
  if (o.tags !== undefined) {
    if (!Array.isArray(o.tags) || !o.tags.every((x) => typeof x === 'string')) throw new Error('INVALID_QUERY_CONFIG');
    cfg.tags = o.tags;
  }
  if (o.priceMax !== undefined) {
    if (typeof o.priceMax !== 'number' || !Number.isFinite(o.priceMax) || o.priceMax < 0) throw new Error('INVALID_QUERY_CONFIG');
    cfg.priceMax = Math.floor(o.priceMax);
  }
  if (o.isToday !== undefined) {
    if (typeof o.isToday !== 'boolean') throw new Error('INVALID_QUERY_CONFIG');
    cfg.isToday = o.isToday;
  }
  if (o.source !== undefined) {
    if (typeof o.source !== 'string' || !SOURCES.has(o.source)) throw new Error('INVALID_QUERY_CONFIG');
    cfg.source = o.source as CollectionQueryConfig['source'];
  }
  if (o.limit !== undefined) {
    if (typeof o.limit !== 'number' || !Number.isInteger(o.limit) || o.limit < 1 || o.limit > 100) throw new Error('INVALID_QUERY_CONFIG');
    cfg.limit = o.limit;
  }
  if (o.sort !== undefined) {
    if (typeof o.sort !== 'string' || !SORTS.has(o.sort)) throw new Error('INVALID_QUERY_CONFIG');
    cfg.sort = o.sort as CollectionQueryConfig['sort'];
  }

  return cfg;
}

export function mapQueryConfigSourceToPrisma(source?: CollectionQueryConfig['source']): EventSource | undefined {
  if (!source) return undefined;
  if (source === 'TICKETSCLOUD') return EventSource.TC;
  if (source === 'TEPLOHOD') return EventSource.TEPLOHOD;
  return undefined;
}
