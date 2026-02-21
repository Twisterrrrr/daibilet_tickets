/**
 * Унификация session.prices (TC / Teplohod — разные форматы).
 * ВАЖНО: `amount` в TC/TEP — это количество мест, НЕ цена!
 * Используйте только amountCents или price для цены в копейках.
 */

export interface NormalizedPrice {
  /** Тип билета (adult, child, standard и т.д.) или name из sync */
  type: string;
  /** Цена в копейках */
  amountCents: number;
  /** Валюта */
  currency: string;
  /** Доступное количество мест */
  available: number;
}

type RawPriceItem = {
  type?: string;
  name?: string;
  price?: number;
  amountCents?: number;
  amount?: number;
  amountVacant?: number;
  [key: string]: unknown;
};

const DEFAULT_CURRENCY = 'RUB';

/**
 * Извлекает цену в копейках из элемента prices.
 * НЕ использует amount (количество мест) как цену — это частая ошибка (1 ₽ bug).
 */
export function getPriceKopecks(item: RawPriceItem | null | undefined): number | null {
  if (!item || typeof item !== 'object') return null;
  if (item.amountCents != null && item.amountCents > 0) return item.amountCents;
  if (item.price != null && item.price > 0) return item.price;
  return null;
}

/**
 * Нормализует сырой массив session.prices в единый формат.
 */
export function normalizeSessionPrices(raw: unknown): NormalizedPrice[] {
  if (!Array.isArray(raw)) return [];
  const result: NormalizedPrice[] = [];
  for (const p of raw) {
    const item = p as RawPriceItem;
    const kopecks = getPriceKopecks(item);
    if (kopecks == null) continue;
    const type = item.type ?? item.name ?? 'default';
    const available = item.amountVacant ?? item.amount ?? 0;
    result.push({
      type: String(type),
      amountCents: kopecks,
      currency: DEFAULT_CURRENCY,
      available: Math.max(0, Number(available)),
    });
  }
  return result;
}

/**
 * Получить минимальную цену из session.prices (в копейках).
 */
export function getMinPriceKopecks(raw: unknown): number | null {
  const normalized = normalizeSessionPrices(raw);
  if (normalized.length === 0) return null;
  const min = Math.min(...normalized.map((n) => n.amountCents));
  return min > 0 ? min : null;
}

/** Маппинг русских названий билетов → type для совместимости с planner/combo */
const TYPE_ALIASES: Record<string, string[]> = {
  adult: ['adult', 'взрослый', 'взрослые', 'standard', 'основной'],
  child: ['child', 'детский', 'дети', 'детский билет'],
};

/**
 * Получить цену по типу (adult, child и т.д.) из session.prices.
 * Сопоставление по type/name (регистронезависимо) или алиасам.
 * Если тип не найден — возвращает минимальную цену (многие провайдеры не различают adult/child).
 */
export function getPriceByTypeKopecks(raw: unknown, type: string): number {
  const normalized = normalizeSessionPrices(raw);
  if (normalized.length === 0) return 0;
  const lower = type.toLowerCase();
  const aliases = TYPE_ALIASES[lower] ?? [lower];
  const found = normalized.find((n) => {
    const t = n.type.toLowerCase();
    return aliases.some((a) => t === a || t.includes(a));
  });
  if (found) return found.amountCents;
  return Math.min(...normalized.map((n) => n.amountCents));
}

/**
 * Получить цену первого доступного типа (для фильтров/лендингов).
 */
export function getFirstPriceKopecks(raw: unknown): number | null {
  return getMinPriceKopecks(raw);
}
