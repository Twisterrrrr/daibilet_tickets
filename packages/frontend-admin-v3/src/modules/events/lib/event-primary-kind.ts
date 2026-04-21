import type { AdminEventDetail } from '@/modules/events/api/detail';

/** Канонический тип события в БД (Event.category) — определяет набор PRIMARY подкатегорий (5 направлений каталога). */
export type EventPrimaryKind =
  | 'EXCURSION'
  | 'MUSEUM'
  | 'EVENT'
  | 'ACTIVITY'
  | 'ENTERTAINMENT';

export const EVENT_PRIMARY_KIND_LABELS: Record<EventPrimaryKind, string> = {
  EXCURSION: 'Экскурсии',
  MUSEUM: 'Музеи и выставки',
  EVENT: 'Мероприятия (концерты, шоу, театр, фестивали)',
  ACTIVITY: 'Активный отдых',
  ENTERTAINMENT: 'Развлечения',
};

/** Производные секции витрины → bucket категории события в БД. */
function sectionSlugToKind(slug: string): EventPrimaryKind | null {
  if (slug === 'excursions') return 'EXCURSION';
  if (slug === 'museums') return 'MUSEUM';
  if (slug === 'events') return 'EVENT';
  if (slug === 'activities') return 'ACTIVITY';
  if (slug === 'entertainment') return 'ENTERTAINMENT';
  return null;
}

/** Несколько разных «типов» по подкатегориям — нужно явно выбрать категорию вручную. */
export function isPrimaryKindAmbiguous(sections: AdminEventDetail['sectionsDerived'] | undefined): boolean {
  const kinds = new Set<EventPrimaryKind>();
  for (const s of sections ?? []) {
    const k = sectionSlugToKind(s.slug);
    if (k) kinds.add(k);
  }
  return kinds.size > 1;
}

/**
 * Начальное значение селекта: при конфликте производных секций — пусто;
 * иначе категория из записи (если есть).
 */
export function initialPrimaryKindSelect(e: AdminEventDetail): '' | EventPrimaryKind {
  if (isPrimaryKindAmbiguous(e.sectionsDerived)) return '';
  const cat = e.category as EventPrimaryKind | undefined;
  if (
    cat === 'EXCURSION' ||
    cat === 'MUSEUM' ||
    cat === 'EVENT' ||
    cat === 'ACTIVITY' ||
    cat === 'ENTERTAINMENT'
  )
    return cat;
  return '';
}
