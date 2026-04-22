import type { AdminEventDetail } from '@/modules/events/api/detail';
import type { EventPrimaryKind } from '@/modules/events/lib/event-primary-kind';

export type EventSubcategoryOption = { id: string; slug: string; name: string; isActive: boolean };

/** Подстроки slug для приоритизации под выбранный тип каталога (мягкие эвристики). */
const KIND_SLUG_HINTS: Record<EventPrimaryKind, readonly string[]> = {
  EXCURSION: [
    'river',
    'walk',
    'bus',
    'boat',
    'tour',
    'gastro',
    'night',
    'city',
    'private',
    'group',
    'cruise',
    'combined',
    'quest',
  ],
  MUSEUM: ['museum', 'exhib', 'gallery', 'planet', 'palace', 'park', 'art', 'space'],
  EVENT: [
    'concert',
    'theater',
    'theatre',
    'show',
    'standup',
    'festival',
    'lecture',
    'opera',
    'ballet',
    'party',
    'jazz',
    'kids-show',
    'immersive',
    'open-air',
    'conference',
    'meetup',
    'seasonal',
    'masterclass',
  ],
  ACTIVITY: [
    'sport',
    'water',
    'kart',
    'climb',
    'extreme',
    'yoga',
    'hike',
    'ski',
    'spa',
    'wellness',
    'team',
    'shooting',
    'ice-skating',
    'cycling',
    'outdoor',
    'hiking',
    'tracking',
  ],
  ENTERTAINMENT: [
    'quest',
    'escape',
    'rooftop',
    'interactive',
    'game',
    'attraction',
    'zoo',
    'aquarium',
    'circus',
    'cinema',
    'nightclub',
    'vr',
    'arcade',
    'bowl',
    'food-court',
    'kids-act',
  ],
};

const SECTION_SLUG_HINTS: Record<
  NonNullable<AdminEventDetail['sectionsDerived']>[number]['slug'],
  readonly string[]
> = {
  excursions: KIND_SLUG_HINTS.EXCURSION,
  museums: KIND_SLUG_HINTS.MUSEUM,
  events: KIND_SLUG_HINTS.EVENT,
  activities: KIND_SLUG_HINTS.ACTIVITY,
  entertainment: KIND_SLUG_HINTS.ENTERTAINMENT,
};

function slugMatchesAny(slugLower: string, hints: readonly string[]): boolean {
  return hints.some((h) => slugLower.includes(h));
}

/**
 * Чем выше score, тем выше в списке: сначала выбранные, затем совпадения с типом и производными секциями, затем по алфавиту.
 */
export function scoreSubcategoryOption(
  opt: EventSubcategoryOption,
  ctx: {
    primaryKind: EventPrimaryKind | '';
    sectionsDerived: AdminEventDetail['sectionsDerived'];
  },
): number {
  let score = 0;
  const slug = opt.slug.toLowerCase();

  if (ctx.primaryKind && KIND_SLUG_HINTS[ctx.primaryKind]) {
    if (slugMatchesAny(slug, KIND_SLUG_HINTS[ctx.primaryKind])) score += 500;
  }

  for (const sec of ctx.sectionsDerived ?? []) {
    const hints = SECTION_SLUG_HINTS[sec.slug];
    if (hints && slugMatchesAny(slug, hints)) score += 80;
  }

  return score;
}

export function sortEventSubcategoryOptions<T extends EventSubcategoryOption>(
  options: T[],
  ctx: {
    primaryKind: EventPrimaryKind | '';
    sectionsDerived: AdminEventDetail['sectionsDerived'];
  },
): T[] {
  return [...options].sort((a, b) => {
    const da = scoreSubcategoryOption(a, ctx);
    const db = scoreSubcategoryOption(b, ctx);
    if (db !== da) return db - da;
    return a.name.localeCompare(b.name, 'ru');
  });
}
