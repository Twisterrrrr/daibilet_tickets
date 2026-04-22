import type { VenueLifecycleStatus } from '@/modules/venues/api/candidates';

/** Единые русские подписи статуса жизненного цикла площадки (Prisma `VenueLifecycleStatus`). */
export const VENUE_LIFECYCLE_LABEL_RU: Record<VenueLifecycleStatus, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активна',
  MERGED: 'Объединена',
  REJECTED: 'Отклонена',
};

export function venueLifecycleLabelRu(status: string): string {
  return VENUE_LIFECYCLE_LABEL_RU[status as VenueLifecycleStatus] ?? status;
}
