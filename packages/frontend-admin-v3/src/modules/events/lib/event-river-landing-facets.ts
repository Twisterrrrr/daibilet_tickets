import type { AdminEventDetail } from '@/modules/events/api/detail';

/**
 * Канонический PRIMARY для речных прогулок (см. subcategories-canonical: code RIVER → slug river-excursion).
 * Фасеты «теплоход / меню / формат» нужны только для этой линейки, не для пеших/автобусных и т.д.
 */
const RIVER_PRIMARY_SLUG = 'river-excursion';

/**
 * Показывать блок редактирования полей таблицы лендинга (теплоход, меню, формат).
 * Условие: среди привязанных подкатегорий есть речная (RIVER).
 */
export function eventShowsRiverLandingTableFacets(detail: AdminEventDetail): boolean {
  return (detail.subcategoriesCanonical ?? []).some((s) => s.slug === RIVER_PRIMARY_SLUG);
}
