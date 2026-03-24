import type { VenueDetail } from '@daibilet/shared';

type FaqItem = { q: string; a: string };
type HoursMap = Record<string, string | null>;

export type BuiltVenueTemplateSections = {
  /** Подзаголовок H1 в hero: `template.intro.title` без замены официального названия в JSON-LD. */
  heroTitle: string | null;
  introLead: string | null;
  descriptionHtml: string | null;
  /** Буллеты «О месте»: приоритет `template.intro.highlights`, иначе legacy `venue.highlights`. */
  highlights: string[];
  galleryUrls: string[];
  openingHours: HoursMap | null;
  visitingRules: string | null;
  collections: string[];
  collectionsText: string | null;
  permanentExposition: string | null;
  accessibility: {
    audioGuide: boolean;
    interactive: boolean;
    notes: string | null;
  } | null;
  amenities: {
    items: string[];
    text: string | null;
  } | null;
  faq: FaqItem[];
  eventsCopy: {
    title: string | null;
    intro: string | null;
  } | null;
};

export function buildVenueTemplateSections(venue: VenueDetail): BuiltVenueTemplateSections {
  const template = venue.template;
  const sections = template?.sections;

  const heroTitle = firstNonEmptyString(sections?.intro?.title ?? null);
  const introLead = firstNonEmptyString(sections?.intro?.lead, venue.shortDescription ?? null);
  const descriptionHtml = firstNonEmptyString(sections?.intro?.longDescription, venue.description ?? null);
  const highlights = firstNonEmptyStringArray(
    sections?.intro?.highlights ?? null,
    Array.isArray(venue.highlights) ? venue.highlights : null,
  );

  const galleryUrls = firstNonEmptyStringArray(sections?.gallery?.images ?? null, venue.galleryUrls ?? null);
  const openingHours = firstNonEmptyHours(sections?.visitInfo?.openingHours ?? null, venue.openingHours ?? null);
  const visitingRules = firstNonEmptyString(sections?.visitInfo?.visitingRules ?? null);

  const collections = firstNonEmptyStringArray(sections?.collections?.items ?? null);
  const collectionsText = firstNonEmptyString(sections?.collections?.text ?? null);
  const permanentExposition = firstNonEmptyString(sections?.permanentExposition?.text ?? null);

  const accessibility = buildAccessibility(sections?.accessibility);
  const amenities = buildAmenities(sections?.amenities);
  const faq = firstNonEmptyFaq(sections?.faq?.items ?? null, venue.faq ?? null);
  const eventsCopy = buildEventsCopy(sections?.eventsCopy?.title ?? null, sections?.eventsCopy?.intro ?? null);

  return {
    heroTitle,
    introLead,
    descriptionHtml,
    highlights,
    galleryUrls,
    openingHours,
    visitingRules,
    collections,
    collectionsText,
    permanentExposition,
    accessibility,
    amenities,
    faq,
    eventsCopy,
  };
}

function buildAmenities(
  section: { items?: string[] | null; text?: string | null } | null | undefined,
): { items: string[]; text: string | null } | null {
  const items = firstNonEmptyStringArray(section?.items ?? null);
  const text = firstNonEmptyString(section?.text ?? null);
  if (items.length === 0 && !text) return null;
  return { items, text };
}

function buildEventsCopy(title: string | null, intro: string | null): { title: string | null; intro: string | null } | null {
  const normalizedTitle = firstNonEmptyString(title);
  const normalizedIntro = firstNonEmptyString(intro);
  if (!normalizedTitle && !normalizedIntro) return null;
  return { title: normalizedTitle, intro: normalizedIntro };
}

function buildAccessibility(
  section:
    | {
        audioGuide?: boolean | null;
        interactive?: boolean | null;
        notes?: string | null;
      }
    | null
    | undefined,
): { audioGuide: boolean; interactive: boolean; notes: string | null } | null {
  const audioGuide = Boolean(section?.audioGuide);
  const interactive = Boolean(section?.interactive);
  const notes = firstNonEmptyString(section?.notes ?? null);
  if (!audioGuide && !interactive && !notes) return null;
  return { audioGuide, interactive, notes };
}

function firstNonEmptyString(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function firstNonEmptyStringArray(...values: Array<string[] | null | undefined>): string[] {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    const normalized = value.map((item) => item.trim()).filter(Boolean);
    if (normalized.length > 0) return normalized;
  }
  return [];
}

function firstNonEmptyFaq(...values: Array<FaqItem[] | null | undefined>): FaqItem[] {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    const normalized = value
      .map((item) => ({ q: item.q?.trim() ?? '', a: item.a?.trim() ?? '' }))
      .filter((item) => item.q && item.a);
    if (normalized.length > 0) return normalized;
  }
  return [];
}

function firstNonEmptyHours(...values: Array<HoursMap | null | undefined>): HoursMap | null {
  for (const value of values) {
    if (!value || typeof value !== 'object') continue;
    if (Object.keys(value).length > 0) return value;
  }
  return null;
}
