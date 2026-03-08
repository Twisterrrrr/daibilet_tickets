import type { PromoBlockDto } from '@/lib/api';

/** Дефолтный градиент при отсутствии gradientFrom/gradientTo */
export const PROMO_DEFAULT_GRADIENT = 'linear-gradient(135deg, #6366f1, #8b5cf6)';

/**
 * Fallback — универсальные evergreen-блоки при технической деградации API.
 * Включается ТОЛЬКО при: network error, 5xx, broken response, все блоки невалидны.
 * НЕ включается при успешном пустом [] (админ отключил все блоки).
 */
export const PROMO_BLOCKS_FALLBACK: PromoBlockDto[] = [
  {
    slug: 'top-excursions',
    title: 'Топ экскурсий',
    description: 'Самые популярные маршруты и городские программы',
    href: '/events',
    iconSource: 'LIBRARY',
    iconKey: 'sparkles',
    iconSvg: null,
    bgMode: 'GRADIENT',
    bgColor: null,
    gradientFrom: '#5B5BD6',
    gradientTo: '#7A4FE0',
  },
  {
    slug: 'weekend-ideas',
    title: 'Идеи на выходные',
    description: 'Куда сходить и что посмотреть в ближайшие дни',
    href: '/events',
    iconSource: 'LIBRARY',
    iconKey: 'calendar-days',
    iconSvg: null,
    bgMode: 'GRADIENT',
    bgColor: null,
    gradientFrom: '#3E6AE1',
    gradientTo: '#5B8CFF',
  },
  {
    slug: 'with-kids',
    title: 'С детьми',
    description: 'Семейные события, музеи и маршруты для отдыха вместе',
    href: '/events?audience=KIDS',
    iconSource: 'LIBRARY',
    iconKey: 'baby',
    iconSvg: null,
    bgMode: 'GRADIENT',
    bgColor: null,
    gradientFrom: '#E25A8A',
    gradientTo: '#F28A65',
  },
  {
    slug: 'museums-and-exhibitions',
    title: 'Музеи и выставки',
    description: 'Проверенные культурные места и интересные экспозиции',
    href: '/events?category=MUSEUM',
    iconSource: 'LIBRARY',
    iconKey: 'building-2',
    iconSvg: null,
    bgMode: 'GRADIENT',
    bgColor: null,
    gradientFrom: '#2C7A7B',
    gradientTo: '#38A169',
  },
  {
    slug: 'river-and-city',
    title: 'Речные и городские прогулки',
    description: 'Водные маршруты, обзорные прогулки и знаковые виды города',
    href: '/events',
    iconSource: 'LIBRARY',
    iconKey: 'ship',
    iconSvg: null,
    bgMode: 'GRADIENT',
    bgColor: null,
    gradientFrom: '#1F7AE0',
    gradientTo: '#14B8C4',
  },
  {
    slug: 'today-in-city',
    title: 'Сегодня в городе',
    description: 'Актуальные варианты досуга на сегодня и ближайшее время',
    href: '/events',
    iconSource: 'LIBRARY',
    iconKey: 'ticket',
    iconSvg: null,
    bgMode: 'GRADIENT',
    bgColor: null,
    gradientFrom: '#F08A24',
    gradientTo: '#E85D3F',
  },
];

/**
 * Нормализует блок к безопасной форме, отбрасывает невалидные.
 */
export function normalizePromoBlock(raw: PromoBlockDto): PromoBlockDto | null {
  const title = (raw.title ?? '').trim();
  if (!title) return null;

  let href = (raw.href ?? '').trim();
  if (!href) {
    const slug = (raw.slug ?? '').trim();
    if (slug) {
      href = `/promo/${slug}`;
    } else {
      return null;
    }
  }

  const slug = (raw.slug ?? raw.title ?? '').trim() || `promo-${Math.random().toString(36).slice(2, 8)}`;
  const description = (raw.description ?? '').trim();
  const iconSource = raw.iconSource === 'SVG' ? 'SVG' : 'LIBRARY';
  const iconKey = iconSource === 'LIBRARY' && raw.iconKey ? String(raw.iconKey).trim() || null : null;
  const iconSvg = iconSource === 'SVG' && raw.iconSvg ? String(raw.iconSvg).trim() || null : null;
  if (iconSource === 'SVG' && !iconSvg) return null;

  const bgMode = raw.bgMode === 'SOLID' ? 'SOLID' : 'GRADIENT';
  const bgColor =
    bgMode === 'SOLID' && raw.bgColor ? String(raw.bgColor).trim() || '#6366f1' : bgMode === 'SOLID' ? '#6366f1' : null;
  const gradientFrom =
    bgMode === 'GRADIENT' && raw.gradientFrom ? String(raw.gradientFrom).trim() || '#6366f1' : '#6366f1';
  const gradientTo =
    bgMode === 'GRADIENT' && raw.gradientTo ? String(raw.gradientTo).trim() || '#8b5cf6' : '#8b5cf6';

  return {
    slug,
    title,
    description,
    href,
    iconSource,
    iconKey,
    iconSvg,
    bgMode,
    bgColor,
    gradientFrom,
    gradientTo,
  };
}

/**
 * Нормализует массив блоков, отбрасывает невалидные.
 */
export function normalizePromoBlocks(raw: PromoBlockDto[]): PromoBlockDto[] {
  if (!Array.isArray(raw)) return [];
  const result: PromoBlockDto[] = [];
  for (const item of raw) {
    const normalized = normalizePromoBlock(item);
    if (normalized) result.push(normalized);
  }
  return result;
}

export type LoadPromoBlocksResult =
  | { kind: 'error' }
  | { kind: 'success'; raw: PromoBlockDto[] };

/**
 * Загружает промо-блоки и возвращает результат для принятия решения о fallback.
 */
export async function loadPromoBlocksSafe(
  fetchFn: () => Promise<PromoBlockDto[]>,
): Promise<LoadPromoBlocksResult> {
  try {
    const raw = await fetchFn();
    if (!Array.isArray(raw)) return { kind: 'error' };
    return { kind: 'success', raw };
  } catch {
    return { kind: 'error' };
  }
}

/**
 * Решает, какие блоки показать: API данные, пусто или fallback.
 */
export function resolvePromoBlocks(result: LoadPromoBlocksResult): PromoBlockDto[] {
  if (result.kind === 'error') {
    return PROMO_BLOCKS_FALLBACK;
  }
  if (result.raw.length === 0) {
    return [];
  }
  const valid = normalizePromoBlocks(result.raw);
  if (valid.length > 0) {
    return valid;
  }
  return PROMO_BLOCKS_FALLBACK;
}
