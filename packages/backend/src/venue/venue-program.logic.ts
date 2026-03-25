import { DateMode, EventSubcategory, Prisma } from '@prisma/client';

import { buildCatalogPublishableCoreWhere } from '../catalog/where-builders';

/** Верхняя граница «бессрочной» open-date выставки для сравнения дат. */
export const VENUE_PROGRAM_FAR_FUTURE = new Date('2099-12-31T23:59:59.999Z');

export type VenueProgramState = 'CURRENT' | 'UPCOMING' | 'PAST';

/**
 * Prisma-where для выставок площадки: та же база что каталог + venue + подкатегория EXHIBITION + модерация + override.
 */
export function buildVenueProgramEventWhere(venueId: string): Prisma.EventWhereInput {
  return {
    AND: [
      buildCatalogPublishableCoreWhere(),
      { venueId },
      { moderationStatus: 'APPROVED' },
      { subcategories: { has: EventSubcategory.EXHIBITION } },
      {
        OR: [
          { override: null },
          {
            override: {
              editorStatus: 'PUBLISHED',
              isHidden: false,
              showInVenueProgram: true,
            },
          },
        ],
      },
    ],
  };
}

export function classifyProgramState(now: Date, startsAtMin: Date, endsAtMax: Date): VenueProgramState {
  if (startsAtMin.getTime() > now.getTime()) return 'UPCOMING';
  if (endsAtMax.getTime() < now.getTime()) return 'PAST';
  return 'CURRENT';
}

export function computeWindowFromScheduledSessions(
  sessions: { startsAt: Date; endsAt: Date | null }[],
): { startsAtMin: Date; endsAtMax: Date } | null {
  if (sessions.length === 0) return null;
  let startsAtMin = sessions[0].startsAt;
  let endsAtMax = sessions[0].endsAt ?? sessions[0].startsAt;
  for (const s of sessions) {
    if (s.startsAt < startsAtMin) startsAtMin = s.startsAt;
    const end = s.endsAt ?? s.startsAt;
    if (end > endsAtMax) endsAtMax = end;
  }
  return { startsAtMin, endsAtMax };
}

/**
 * OPEN_DATE: конец — endDate или «далеко в будущем» при отсутствии срока; начало — минимум из первого сеанса и начала дня createdAt.
 */
export function computeWindowOpenDate(
  event: { createdAt: Date; endDate: Date | null; isPermanent: boolean },
  sessionStarts: Date[],
): { startsAtMin: Date; endsAtMax: Date } {
  const startOfCreatedDay = new Date(event.createdAt);
  startOfCreatedDay.setHours(0, 0, 0, 0);
  let startsAtMin = startOfCreatedDay;
  if (sessionStarts.length > 0) {
    const minS = new Date(Math.min(...sessionStarts.map((d) => d.getTime())));
    startsAtMin = minS < startOfCreatedDay ? minS : startOfCreatedDay;
  }
  let endsAtMax: Date;
  if (event.endDate) {
    endsAtMax = new Date(event.endDate);
  } else {
    endsAtMax = VENUE_PROGRAM_FAR_FUTURE;
  }
  return { startsAtMin, endsAtMax };
}

export type SortMeta = {
  isFeaturedInVenue: boolean;
  venueProgramSortOrder: number | null;
  manualBoost: number | null;
  endsAt: number;
  startsAt: number;
};

export function buildSortMeta(
  row: {
    startsAtMin: Date;
    endsAtMax: Date;
    override?: {
      isFeaturedInVenue?: boolean;
      venueProgramSortOrder?: number | null;
      manualBoost?: number | null;
    } | null;
  },
): SortMeta {
  const o = row.override;
  return {
    isFeaturedInVenue: o?.isFeaturedInVenue === true,
    venueProgramSortOrder: o?.venueProgramSortOrder ?? null,
    manualBoost: o?.manualBoost ?? null,
    endsAt: row.endsAtMax.getTime(),
    startsAt: row.startsAtMin.getTime(),
  };
}

export function compareCurrent(a: SortMeta, b: SortMeta): number {
  if (a.isFeaturedInVenue !== b.isFeaturedInVenue) return a.isFeaturedInVenue ? -1 : 1;
  const ao = a.venueProgramSortOrder;
  const bo = b.venueProgramSortOrder;
  if (ao != null || bo != null) {
    if (ao == null) return 1;
    if (bo == null) return -1;
    if (ao !== bo) return ao - bo;
  }
  const ab = a.manualBoost ?? 0;
  const bb = b.manualBoost ?? 0;
  if (ab !== bb) return bb - ab;
  if (a.endsAt !== b.endsAt) return a.endsAt - b.endsAt;
  return a.startsAt - b.startsAt;
}

export function compareUpcoming(a: SortMeta, b: SortMeta): number {
  if (a.isFeaturedInVenue !== b.isFeaturedInVenue) return a.isFeaturedInVenue ? -1 : 1;
  const ao = a.venueProgramSortOrder;
  const bo = b.venueProgramSortOrder;
  if (ao != null || bo != null) {
    if (ao == null) return 1;
    if (bo == null) return -1;
    if (ao !== bo) return ao - bo;
  }
  return a.startsAt - b.startsAt;
}

export function comparePast(a: SortMeta, b: SortMeta): number {
  return b.endsAt - a.endsAt;
}
