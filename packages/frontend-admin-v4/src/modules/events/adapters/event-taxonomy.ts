import type { EventDetailDto, EventType, TagGroup } from '@/modules/events/types';

export type EventClassification = {
  eventType: EventType;
  category: string | null;
  primarySubcategory: { id: string; slug: string; name: string } | null;
  secondarySubcategories: Array<{ id: string; slug: string; name: string }>;
  tagsByGroup: Record<TagGroup, Array<{ id: string; slug: string; name: string }>>;
  unknownTagGroups: Array<{ group: string; tagSlug: string }>;
};

function normalizeEventType(dateMode?: string | null): EventType {
  const dm = (dateMode ?? '').toUpperCase();
  if (dm === 'SCHEDULED' || dm === 'ONE_TIME') return 'one_time';
  if (dm === 'RECURRING') return 'recurring';
  if (dm === 'OPEN_DATE') return 'open_date';
  return 'unknown';
}

function toGroup(tag: { structuralGroup?: string | null; category?: string | null; tagKind?: string | null }): { group: TagGroup; raw?: string } {
  const k = (tag.tagKind ?? '').toUpperCase();
  if (k === 'POPULAR') return { group: 'POPULAR' };
  const g = (tag.structuralGroup ?? tag.category ?? '').toUpperCase();
  if (g === 'THEME') return { group: 'THEME' };
  if (g === 'FORMAT') return { group: 'FORMAT' };
  if (g === 'AUDIENCE') return { group: 'AUDIENCE' };
  if (g === 'LANGUAGE') return { group: 'LANGUAGE' };
  if (g === 'SPECIAL') return { group: 'SPECIAL' };
  if (g === 'SEASON') return { group: 'SEASON' };
  return { group: 'UNKNOWN', raw: g || undefined };
}

export function buildEventClassification(event: EventDetailDto): EventClassification {
  const links = event.subcategoryLinks ?? [];
  const primary = links.find((l) => (l.subcategory?.layer ?? '').toUpperCase() === 'PRIMARY')?.subcategory ?? null;
  const secondary = links.filter((l) => (l.subcategory?.layer ?? '').toUpperCase() === 'SECONDARY').map((l) => l.subcategory);

  const secondaryClean = secondary
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => ({ id: s.id, slug: s.slug, name: s.nameRu ?? s.slug }));

  const tagsByGroup: Record<TagGroup, Array<{ id: string; slug: string; name: string }>> = {
    THEME: [],
    FORMAT: [],
    AUDIENCE: [],
    LANGUAGE: [],
    SPECIAL: [],
    SEASON: [],
    POPULAR: [],
    UNKNOWN: [],
  };

  const unknownTagGroups: Array<{ group: string; tagSlug: string }> = [];

  for (const t of event.tags ?? []) {
    const tag = t.tag;
    if (!tag) continue;
    const { group, raw } = toGroup(tag);
    const row = { id: tag.id, slug: tag.slug, name: tag.name ?? tag.slug };
    tagsByGroup[group].push(row);
    if (group === 'UNKNOWN' && raw) unknownTagGroups.push({ group: raw, tagSlug: tag.slug });
  }

  return {
    eventType: normalizeEventType(event.dateMode ?? null),
    category: (event.override?.category ?? event.category) ?? null,
    primarySubcategory: primary ? { id: primary.id, slug: primary.slug, name: primary.nameRu ?? primary.slug } : null,
    secondarySubcategories: secondaryClean,
    tagsByGroup,
    unknownTagGroups,
  };
}

