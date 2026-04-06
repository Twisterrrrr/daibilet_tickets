import { EventCategory } from '@prisma/client';

/** PRIMARY EVENT_ONLY по категории события (код = EventSubcategory). */
export const EVENT_PRIMARY_CODES_BY_CATEGORY: Record<EventCategory, readonly string[]> = {
  EXCURSION: ['RIVER', 'WALKING', 'BUS', 'COMBINED', 'QUEST', 'GASTRO', 'ROOFTOP', 'EXTREME'],
  MUSEUM: [
    'MUSEUM_CLASSIC',
    'EXHIBITION',
    'GALLERY',
    'PALACE',
    'PARK',
    'ART_SPACE',
    'SCULPTURE',
    'CONTEMPORARY',
  ],
  EVENT: ['CONCERT', 'SHOW', 'STANDUP', 'THEATER', 'SPORT', 'FESTIVAL', 'MASTERCLASS', 'PARTY'],
};

/** PRIMARY VENUE_ONLY (код совпадает с публичным API; тип VENUE_ONLY отличает от EVENT_ONLY при совпадении имён). */
export const VENUE_PRIMARY_CODES: readonly string[] = [
  'MUSEUM',
  'EXHIBITION',
  'GALLERY',
  'PALACE',
  'PARK',
  'ART_SPACE',
  'THEATER',
];

export const MAX_SECONDARY_SUBCATEGORIES = 3;

/** Стартовый набор SECONDARY UNIVERSAL (расширяется через админку). FAMILY — slug family-friendly в seed. */
export const SEED_SECONDARY_UNIVERSAL: ReadonlyArray<{
  code: string;
  nameRu: string;
  sortOrder: number;
}> = [
  { code: 'NIGHT', nameRu: 'Ночные', sortOrder: 10 },
  { code: 'HISTORY', nameRu: 'История', sortOrder: 30 },
  { code: 'ARCHITECTURE', nameRu: 'Архитектура', sortOrder: 40 },
  { code: 'ROMANTIC', nameRu: 'Романтические', sortOrder: 50 },
  { code: 'INDOOR', nameRu: 'В помещении', sortOrder: 60 },
  { code: 'OUTDOOR', nameRu: 'На улице', sortOrder: 70 },
  { code: 'INTERACTIVE', nameRu: 'Интерактив', sortOrder: 80 },
  { code: 'KIDS', nameRu: 'С детьми', sortOrder: 90 },
  { code: 'ART', nameRu: 'Искусство', sortOrder: 100 },
];
