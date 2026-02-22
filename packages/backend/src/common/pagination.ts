/**
 * Единый pagination contract для админки и API.
 *
 * Поддерживает два режима:
 *   1. Cursor-based (если передан cursor) — O(1), не деградирует на больших offset.
 *   2. Offset-based fallback (page + limit) — совместимость с фронтендом.
 *
 * Все контроллеры ОБЯЗАНЫ использовать parsePagination() + buildPaginatedResult().
 * Лимит: 1 ≤ limit ≤ 200.
 *
 * Формат ответа:
 *   { items: T[], total: number, nextCursor: string | null, hasMore: boolean }
 */

// ─── Types ──────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginationParams {
  /** Cursor (UUID) — если передан, skip игнорируется */
  cursor?: string;
  /** Номер страницы (1-based, для offset-mode) */
  page: number;
  /** Количество элементов на странице (1-200) */
  limit: number;
}

// ─── Parsing ────────────────────────────────────────────

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

/**
 * Парсинг и нормализация raw query params в PaginationParams.
 *
 * @example
 *   parsePagination({ cursor: 'abc', limit: '25' })
 *   parsePagination({ page: '3', limit: '100' })
 */
export function parsePagination(raw: {
  cursor?: string;
  page?: string | number;
  limit?: string | number;
}): PaginationParams {
  const limit = Math.min(Math.max(Number(raw.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cursor = raw.cursor && typeof raw.cursor === 'string' ? raw.cursor : undefined;
  const page = cursor ? 1 : Math.max(Number(raw.page) || 1, 1);
  return { cursor, page, limit };
}

// ─── Prisma Args ────────────────────────────────────────

/**
 * Построить аргументы take/skip/cursor для Prisma findMany.
 *
 * Всегда запрашивает limit+1, чтобы определить hasMore.
 */
export function paginationArgs(params: PaginationParams): {
  take: number;
  skip: number;
  cursor?: { id: string };
} {
  const { cursor, page, limit } = params;

  if (cursor) {
    return {
      take: limit + 1,
      skip: 1, // пропускаем сам cursor-элемент
      cursor: { id: cursor },
    };
  }

  return {
    take: limit + 1,
    skip: (page - 1) * limit,
  };
}

// ─── Result Builder ─────────────────────────────────────

/**
 * Превращает «сырые» результаты (limit+1 штук) в PaginatedResult.
 */
export function buildPaginatedResult<T extends { id: string }>(
  rawItems: T[],
  total: number,
  limit: number,
): PaginatedResult<T> {
  const hasMore = rawItems.length > limit;
  const items = hasMore ? rawItems.slice(0, limit) : rawItems;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  return { items, total, nextCursor, hasMore };
}
