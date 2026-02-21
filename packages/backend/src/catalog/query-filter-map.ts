/**
 * Маппинг QF slug → params для каталога.
 * Используется в getEvents / getCatalogMuseumAndVenues при применении qf.
 */
import { EventSubcategory, VenueType } from '@prisma/client';

export type CatalogType = 'excursion' | 'venue' | 'event';

export interface QFEventParams {
  subcategory?: EventSubcategory;
  subcategories?: EventSubcategory[];
  tag?: string;
  audience?: string;
  maxDuration?: number;
  minDuration?: number;
  maxMinAge?: number;
  dateMode?: string;
}

export interface QFVenueParams {
  venueType?: VenueType;
  venueTypes?: VenueType[];
  tag?: string;
  features?: string[];
  district?: string;
  priceFrom?: number; // 0 = бесплатно
}

/** slug (type, slug) → params для Event */
const EXCURSION_MAP: Record<string, Partial<QFEventParams>> = {
  walking: { subcategory: 'WALKING' },
  bus: { subcategory: 'BUS' },
  boat: { subcategory: 'RIVER' },
  sightseeing: { tag: 'sightseeing' },
  history: { tag: 'history' },
  mystic: { tag: 'mystic' },
  'up-to-2h': { maxDuration: 120 },
  '2-4h': { minDuration: 120, maxDuration: 240 },
  'with-children': { audience: 'KIDS' },
};

/** slug → params для Venue */
const VENUE_MAP: Record<string, Partial<QFVenueParams>> = {
  historical: { venueType: 'MUSEUM' }, // исторические музеи — тип MUSEUM
  art: { venueTypes: ['GALLERY', 'ART_SPACE'] },
  interactive: { features: ['kids_friendly'] }, // интерактивные часто с kids_friendly
  'ticket-only': {}, // входной билет — без экскурсии, dateMode OPEN_DATE для event
  'with-guide': { tag: 'with-guide' },
  family: { features: ['kids_friendly'] },
};

/** slug → params для Event (мероприятия) */
const EVENT_MAP: Record<string, Partial<QFEventParams>> = {
  concert: { subcategory: 'CONCERT' },
  theatre: { subcategory: 'THEATER' },
  festival: { subcategory: 'FESTIVAL' },
  rock: { tag: 'rock' },
  classical: { tag: 'classical' },
  '18plus': { maxMinAge: 18 },
};

/**
 * Применить QF slug к params для Event (excursion или event).
 */
export function applyQFToEventParams(
  type: 'excursion' | 'event',
  slug: string,
): Partial<QFEventParams> {
  const map = type === 'excursion' ? EXCURSION_MAP : EVENT_MAP;
  return map[slug] ?? {};
}

/**
 * Применить QF slug к params для Venue.
 */
export function applyQFToVenueParams(slug: string): Partial<QFVenueParams> {
  return VENUE_MAP[slug] ?? {};
}
