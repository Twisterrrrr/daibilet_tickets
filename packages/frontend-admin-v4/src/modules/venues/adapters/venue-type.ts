import type { VenueTypeUi } from '@/modules/venues/types';

// Adapter boundary: keep UI enum stable, only map when backend differs.
export function toVenueTypeQuery(ui: VenueTypeUi): string {
  // Current UI values already match backend `VenueType` enum values.
  // If backend changes, implement mapping here (no Prisma migrations from UI tasks).
  return ui;
}

