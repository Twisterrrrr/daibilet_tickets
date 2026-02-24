/**
 * Утилиты типизации для backend.
 * См. docs/typing-guide.md
 */
import { Prisma } from '@prisma/client';

/** Проверка, что значение — объект (не null, не примитив). */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * Приводит значение к Prisma.InputJsonValue.
 * Гарантирует JSON-совместимость и снимает типовую боль.
 */
export function toJsonValue(v: unknown): Prisma.InputJsonValue {
  if (v === undefined) return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
}

/**
 * Для nullable JSON-полей: null → Prisma.JsonNull.
 */
export function toJsonValueOrNull(v: unknown): Prisma.InputJsonValue {
  if (v === undefined || v === null) return Prisma.JsonNull as unknown as Prisma.InputJsonValue;
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
}

/** Минимальная сущность каталога для нормализации unknown/{} */
export type CatalogEntityLite = {
  id: string;
  slug?: string | null;
  name?: string | null;
  cityId?: string | null;
};

export function asCatalogEntityLite(v: unknown): CatalogEntityLite | null {
  if (!isRecord(v)) return null;
  const id = typeof v.id === 'string' ? v.id : null;
  if (!id) return null;
  const slug = typeof v.slug === 'string' ? v.slug : v.slug === null ? null : undefined;
  const name = typeof v.name === 'string' ? v.name : v.name === null ? null : undefined;
  const cityId = typeof v.cityId === 'string' ? v.cityId : v.cityId === null ? null : undefined;
  return { id, slug, name, cityId };
}

/** Город в карточке каталога */
export type CityLite = { slug?: string | null; name?: string | null };

export function asCityLite(v: unknown): CityLite {
  if (!isRecord(v)) return {};
  return {
    slug: typeof v.slug === 'string' ? v.slug : null,
    name: typeof v.name === 'string' ? v.name : null,
  };
}

/** Безопасное приведение к Date */
export function toDateSafe(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return null;
}

/** Planner: слот дня с event/session/tickets */
export type PlannerSlot = {
  slot?: string;
  time?: string;
  event?: Record<string, unknown>;
  session?: Record<string, unknown>;
  tickets?: { adult?: { count?: number }; child?: { count?: number } };
  subtotal?: number;
};

export function isPlannerSlot(v: unknown): v is PlannerSlot {
  return isRecord(v);
}
