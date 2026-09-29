/**
 * Venue types — UI source of truth (Lovable parity).
 *
 * IMPORTANT: Backend uses Prisma enum `VenueType` (UPPERCASE).
 * This file is UI-facing: labels + normalized IDs.
 */

export type VenueTypeId =
  | 'PIER'
  | 'MUSEUM'
  | 'GALLERY'
  | 'THEATER'
  | 'CONCERT_HALL'
  | 'PARK'
  | 'VIEWPOINT'
  | 'HISTORIC_BUILDING'
  | 'RESTAURANT_BAR'
  | 'SPORTS'
  | 'AQUARIUM_ZOO'
  | 'ESCAPE_ROOM'
  | 'OPEN_AIR'
  | 'OTHER';

export const VENUE_TYPES: { id: VenueTypeId; label: string }[] = [
  { id: 'PIER', label: 'Причал' },
  { id: 'MUSEUM', label: 'Музей' },
  { id: 'GALLERY', label: 'Галерея' },
  { id: 'THEATER', label: 'Театр' },
  { id: 'CONCERT_HALL', label: 'Концертный зал' },
  { id: 'PARK', label: 'Парк' },
  { id: 'VIEWPOINT', label: 'Смотровая площадка' },
  { id: 'HISTORIC_BUILDING', label: 'Историческое здание' },
  { id: 'RESTAURANT_BAR', label: 'Ресторан / Бар' },
  { id: 'SPORTS', label: 'Спортивный объект' },
  { id: 'AQUARIUM_ZOO', label: 'Океанариум / Зоопарк' },
  { id: 'ESCAPE_ROOM', label: 'Квест-комната' },
  { id: 'OPEN_AIR', label: 'Открытая площадка' },
  { id: 'OTHER', label: 'Другое' },
];

export const VENUE_TYPE_LABEL: Record<VenueTypeId, string> = VENUE_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.id]: t.label }),
  {} as Record<VenueTypeId, string>,
);

export function venueTypeLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const key = String(value).toUpperCase() as VenueTypeId;
  return VENUE_TYPE_LABEL[key] ?? value;
}

