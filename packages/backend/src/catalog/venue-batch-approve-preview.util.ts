import type { VenueLifecycleStatus } from '@prisma/client';

/** Статус slug при soft-check (не транзакционная гарантия). */
export type BatchVenueApproveSlugStatus =
  | 'FREE'
  | 'COLLISION_WITH_ACTIVE'
  | 'COLLISION_WITH_REJECTED'
  | 'COLLISION_WITH_MERGED'
  | 'COLLISION_WITH_DRAFT'
  | 'UNKNOWN';

export type BatchVenueApprovePreviewItemStatus = 'OK' | 'WARNING' | 'ERROR';

export function slugStatusFromOtherVenueLifecycle(
  lifecycle: VenueLifecycleStatus,
): Exclude<BatchVenueApproveSlugStatus, 'FREE' | 'UNKNOWN'> {
  switch (lifecycle) {
    case 'ACTIVE':
      return 'COLLISION_WITH_ACTIVE';
    case 'REJECTED':
      return 'COLLISION_WITH_REJECTED';
    case 'MERGED':
      return 'COLLISION_WITH_MERGED';
    case 'DRAFT':
      return 'COLLISION_WITH_DRAFT';
    default:
      return 'COLLISION_WITH_ACTIVE';
  }
}

/**
 * Оценка строки preview: OK — можно подтвердить; WARNING — slug занят неактивным драфтом и т.п.; ERROR — не DRAFT / нет записи.
 */
export function classifyApprovePreviewRow(params: {
  exists: boolean;
  lifecycleStatus: VenueLifecycleStatus | null;
  slugTaken: { id: string; lifecycleStatus: VenueLifecycleStatus } | null;
  proposedSlug: string;
}): {
  status: BatchVenueApprovePreviewItemStatus;
  slugStatus: BatchVenueApproveSlugStatus;
  warningCodes: string[];
  errorCode: string | null;
} {
  const warningCodes: string[] = [];
  if (!params.exists || !params.lifecycleStatus) {
    return {
      status: 'ERROR',
      slugStatus: 'UNKNOWN',
      warningCodes: [],
      errorCode: 'VENUE_APPROVE_PREVIEW_NOT_FOUND',
    };
  }
  if (params.lifecycleStatus !== 'DRAFT') {
    return {
      status: 'ERROR',
      slugStatus: 'UNKNOWN',
      warningCodes: [],
      errorCode: 'VENUE_APPROVE_PREVIEW_NOT_DRAFT',
    };
  }

  if (!params.slugTaken) {
    return {
      status: 'OK',
      slugStatus: 'FREE',
      warningCodes: [],
      errorCode: null,
    };
  }

  const kind = slugStatusFromOtherVenueLifecycle(params.slugTaken.lifecycleStatus);
  if (kind === 'COLLISION_WITH_ACTIVE') {
    warningCodes.push('VENUE_SLUG_COLLISION_ACTIVE');
    return { status: 'ERROR', slugStatus: kind, warningCodes, errorCode: 'VENUE_SLUG_COLLISION_ACTIVE' };
  }
  if (kind === 'COLLISION_WITH_DRAFT') {
    warningCodes.push('VENUE_SLUG_COLLISION_DRAFT');
    return { status: 'WARNING', slugStatus: kind, warningCodes, errorCode: null };
  }
  if (kind === 'COLLISION_WITH_REJECTED') {
    warningCodes.push('VENUE_SLUG_COLLISION_REJECTED');
    return { status: 'WARNING', slugStatus: kind, warningCodes, errorCode: null };
  }
  if (kind === 'COLLISION_WITH_MERGED') {
    warningCodes.push('VENUE_SLUG_COLLISION_MERGED');
    return { status: 'WARNING', slugStatus: kind, warningCodes, errorCode: null };
  }

  return { status: 'OK', slugStatus: 'FREE', warningCodes: [], errorCode: null };
}

export function buildApproveDraftInputForPreview(v: {
  title: string;
  rawName: string | null;
  address: string | null;
  rawAddress: string | null;
  slug: string | null;
}): { title: string; address: string | null; slug?: string; isPublished: false } {
  const title = v.title?.trim() || v.rawName?.trim() || '';
  const address = v.address?.trim() || v.rawAddress?.trim() || null;
  return {
    title,
    address,
    slug: v.slug?.trim() || undefined,
    isPublished: false,
  };
}
