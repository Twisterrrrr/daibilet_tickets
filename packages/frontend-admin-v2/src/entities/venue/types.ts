export type VenueStatus = 'draft' | 'ready' | 'live' | 'paused';
export type VenueType = 'museum' | 'theater' | 'boat' | 'walking' | 'other';

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
