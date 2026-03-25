import type { VenueProgramItemDto } from '@daibilet/shared';

export type ProgramItem = VenueProgramItemDto & {
  isFeaturedInVenue?: boolean;
  venueSortOrder?: number | null;
  manualBoost?: number | null;
};

export type VenueProgramGroups = {
  featured: ProgramItem | null;
  current: ProgramItem[];
  upcoming: ProgramItem[];
};

function isCurrent(item: ProgramItem, now: Date): boolean {
  const starts = new Date(item.startsAt).getTime();
  const ends = new Date(item.endsAt).getTime();
  const t = now.getTime();
  return starts <= t && ends >= t;
}

function isUpcoming(item: ProgramItem, now: Date): boolean {
  const starts = new Date(item.startsAt).getTime();
  return starts > now.getTime();
}

function rankItems(items: ProgramItem[]): ProgramItem[] {
  return [...items].sort((a, b) => {
    if (Boolean(a.isFeaturedInVenue) !== Boolean(b.isFeaturedInVenue)) return a.isFeaturedInVenue ? -1 : 1;
    const ao = a.venueSortOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.venueSortOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    const ab = a.manualBoost ?? 0;
    const bb = b.manualBoost ?? 0;
    if (ab !== bb) return bb - ab;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });
}

export function buildVenueProgramGroups(items: ProgramItem[], now: Date = new Date()): VenueProgramGroups {
  const ranked = rankItems(items);
  const current = ranked.filter((item) => isCurrent(item, now));
  const upcoming = ranked.filter((item) => isUpcoming(item, now));

  let featured: ProgramItem | null = null;
  if (current.length > 0) {
    featured = current[0] ?? null;
  } else if (upcoming.length > 0) {
    featured = upcoming[0] ?? null;
  }

  return {
    featured,
    current: featured ? current.filter((item) => item.id !== featured!.id) : current,
    upcoming: featured ? upcoming.filter((item) => item.id !== featured!.id) : upcoming,
  };
}

