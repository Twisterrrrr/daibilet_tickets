export type VenueStatus = 'draft' | 'ready' | 'live' | 'paused';

/** Как в Prisma `VenueType` — культурные/физические площадки (не причалы и не «пешком/вода» как формат маршрута). */
export type VenueType =
  | 'MUSEUM'
  | 'GALLERY'
  | 'ART_SPACE'
  | 'EXHIBITION_HALL'
  | 'THEATER'
  | 'PALACE'
  | 'PARK';

export interface VenueEntity {
  id: string;
  name: string;
  city: string;
  type: VenueType;
  status: VenueStatus;
  qualityScore: number;
  eventsCount: number;
  shortDescription: string;
  createdAt: string;
  updatedAt: string;
}
