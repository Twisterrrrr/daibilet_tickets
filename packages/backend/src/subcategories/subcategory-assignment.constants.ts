import { EventCategory } from '@/prisma-client';

/** PRIMARY + EVENT_ONLY в справочнике подкатегорий (код = EventSubcategory). */
export const EVENT_PRIMARY_CODES_BY_CATEGORY: Record<EventCategory, readonly string[]> = {
  // Keep in sync with canonical PRIMARY EVENT_ONLY seed (active codes).
  EXCURSION: [
    'WALKING',
    'BUS',
    'BOAT_TOURS',
    'RIVER',
    'NIGHT_TOURS',
    'CITY_TOURS',
    'PRIVATE_TOURS',
    'GASTRO',
    'GROUP_TOURS',
  ],
  MUSEUM: [
    'MUSEUM_CLASSIC',
    'EXHIBITION',
    'PLANETARIUMS',
    'GALLERY',
    'PALACE',
    'PARK',
    'ART_SPACE',
  ],
  EVENT: [
    'CONCERT',
    'JAZZ',
    'THEATER',
    'SHOW',
    'STANDUP',
    'FESTIVAL',
    'LECTURES',
    'KIDS_SHOWS',
    'IMMERSIVE_SHOWS',
    'MASTERCLASS',
    'PARTY',
    'OPERA',
    'BALLET',
    'OPEN_AIR_PRIMARY',
    'CONFERENCE_PRIMARY',
    'MEETUP_PRIMARY',
    'SEASONAL_EVENT_PRIMARY',
  ],
  ACTIVITY: [
    'WATER_SPORTS',
    'CYCLING',
    'OUTDOOR_ACTIVITIES',
    'KARTING',
    'CLIMBING',
    'EXTREME',
    'SPORT_EVENTS',
    'SHOOTING_RANGE',
    'ICE_SKATING',
    'SKIING',
    'YOGA_FITNESS',
    'WELLNESS_SPA',
    'TEAM_BUILDING',
    'HIKING',
    'TRACKING',
  ],
  ENTERTAINMENT: [
    'QUESTS',
    'ROOFTOP',
    'INTERACTIVE_ENT',
    'KIDS_ACTIVITIES',
    'GAME_ZONES',
    'ATTRACTIONS',
    'ESCAPE_ROOMS',
    'ZOO',
    'AQUARIUM',
    'CIRCUS',
    'CINEMA',
    'NIGHTCLUB',
    'VR_ARCADE',
    'BOWLING_ENT',
    'FOOD_COURT_ENT',
  ],
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

/** Событие: 1 PRIMARY + до N SECONDARY; сумма связей ≤ `SubcategoryPolicyService.MAX_EVENT_SUBCATEGORIES` (512 − 1). */
export const MAX_SECONDARY_SUBCATEGORIES_EVENT = 511;

/** Площадка: 1 PRIMARY + до N SECONDARY; сумма связей ≤ `SubcategoryPolicyService.MAX_VENUE_SUBCATEGORIES` (сейчас 4). */
export const MAX_SECONDARY_SUBCATEGORIES_VENUE = 3;

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
