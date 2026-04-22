/**
 * Предпросмотр контентных блоков площадки для админки — та же семантика, что у публичной PDP
 * (см. backend buildVenuePublicTemplate + frontend buildVenueTemplateSections).
 */
import type { AdminVenueDetail } from '@/modules/venues/api/candidates';

export type BuiltVenueTemplateSections = {
  heroTitle: string | null;
  introLead: string | null;
  descriptionHtml: string | null;
  highlights: string[];
  galleryUrls: string[];
  openingHours: Record<string, string | null> | null;
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
  faq: Array<{ q: string; a: string }>;
  eventsCopy: {
    title: string | null;
    intro: string | null;
  } | null;
};

type VenuePublicTemplateSections = {
  intro?: {
    title?: string | null;
    lead?: string | null;
    longDescription?: string | null;
    highlights?: string[] | null;
  } | null;
  gallery?: { images?: string[] | null } | null;
  visitInfo?: {
    openingHours?: Record<string, string | null> | null;
    visitingRules?: string | null;
  } | null;
  collections?: { items?: string[] | null; text?: string | null } | null;
  permanentExposition?: { text?: string | null } | null;
  accessibility?: {
    audioGuide?: boolean | null;
    interactive?: boolean | null;
    notes?: string | null;
  } | null;
  amenities?: { items?: string[] | null; text?: string | null } | null;
  faq?: { items?: Array<{ q: string; a: string }> | null } | null;
  eventsCopy?: { title?: string | null; intro?: string | null } | null;
};

type VenuePublicTemplate = {
  venueType: string;
  supportedTemplateType: boolean;
  sections: VenuePublicTemplateSections;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null;
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function readStringArray(record: Record<string, unknown> | null, key: string): string[] | null {
  if (!record) return null;
  const value = record[key];
  if (!Array.isArray(value)) return null;
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

function readHoursRecord(record: Record<string, unknown> | null, key: string): Record<string, string | null> | null {
  if (!record) return null;
  const value = record[key];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>).map(([day, hours]) => [
    day,
    typeof hours === 'string' ? hours : hours == null ? null : String(hours),
  ]);
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function readFaqArray(record: Record<string, unknown> | null, key: string): Array<{ q: string; a: string }> | null {
  if (!record) return null;
  const value = record[key];
  if (!Array.isArray(value)) return null;
  const items = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const q = typeof (item as { q?: unknown }).q === 'string' ? (item as { q: string }).q.trim() : '';
      const a = typeof (item as { a?: unknown }).a === 'string' ? (item as { a: string }).a.trim() : '';
      if (!q || !a) return null;
      return { q, a };
    })
    .filter((item): item is { q: string; a: string } => Boolean(item));
  return items.length > 0 ? items : null;
}

function pickFirstNonEmptyString(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function pickFirstNonEmptyStringArray(...values: Array<string[] | null | undefined>): string[] | null {
  for (const value of values) {
    if (Array.isArray(value)) {
      const normalized = value.map((item) => item.trim()).filter(Boolean);
      if (normalized.length > 0) return normalized;
    }
  }
  return null;
}

function pickFirstNonEmptyRecord<T extends Record<string, unknown>>(...values: Array<T | null | undefined>): T | null {
  for (const value of values) {
    if (value && Object.keys(value).length > 0) return value;
  }
  return null;
}

function pickFirstNonEmptyFaqArray(
  ...values: Array<Array<{ q: string; a: string }> | null | undefined>
): Array<{ q: string; a: string }> | null {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    const normalized = value
      .map((item) => ({ q: item.q?.trim() ?? '', a: item.a?.trim() ?? '' }))
      .filter((item) => item.q && item.a);
    if (normalized.length > 0) return normalized;
  }
  return null;
}

/** Parsed fields из VenueTemplateData (shared zod), без зависимости от пакета */
function readParsedVenueTemplate(raw: Record<string, unknown>): {
  collections?: string[];
  currentExhibitions?: string;
  permanentExhibitions?: string;
  audioGuide?: boolean;
  interactive?: boolean;
  accessibilityNotes?: string;
} {
  const collections = readStringArray(raw, 'collections') ?? undefined;
  const currentExhibitions = readString(raw, 'currentExhibitions') ?? undefined;
  const permanentExhibitions = readString(raw, 'permanentExhibitions') ?? undefined;
  const audioGuide = typeof raw.audioGuide === 'boolean' ? raw.audioGuide : undefined;
  const interactive = typeof raw.interactive === 'boolean' ? raw.interactive : undefined;
  const accessibilityNotes = readString(raw, 'accessibilityNotes') ?? undefined;
  return {
    ...(collections ? { collections } : {}),
    ...(currentExhibitions ? { currentExhibitions } : {}),
    ...(permanentExhibitions ? { permanentExhibitions } : {}),
    ...(audioGuide !== undefined ? { audioGuide } : {}),
    ...(interactive !== undefined ? { interactive } : {}),
    ...(accessibilityNotes ? { accessibilityNotes } : {}),
  };
}

function isTemplateAwareVenueType(venueType: string): boolean {
  return (
    venueType === 'MUSEUM' ||
    venueType === 'ART_SPACE' ||
    venueType === 'GALLERY' ||
    venueType === 'EXHIBITION_HALL'
  );
}

/**
 * Повторяет backend VenueService.buildVenuePublicTemplate для полей админской карточки.
 */
function buildVenuePublicTemplateFromAdmin(d: AdminVenueDetail): VenuePublicTemplate | null {
  const venueType = d.venueType ?? 'MUSEUM';
  const raw = asRecord(d.venueTemplateData);
  const parsed = raw ? readParsedVenueTemplate(raw) : {};
  const supportedTemplateType = isTemplateAwareVenueType(venueType);

  const legacyHighlights = Array.isArray(d.highlights) ? (d.highlights as string[]) : null;
  const legacyFaq = Array.isArray(d.faq) ? (d.faq as Array<{ q: string; a: string }>) : null;
  const legacyOpening = d.openingHours as Record<string, string | null> | null | undefined;
  const legacyGallery = d.galleryUrls ?? [];

  if (!raw && !supportedTemplateType) return null;

  const introLead = pickFirstNonEmptyString(
    readString(raw, 'lead'),
    readString(raw, 'introLead'),
    d.shortDescription ?? null,
  );
  const introLongDescription = pickFirstNonEmptyString(
    readString(raw, 'longDescription'),
    readString(raw, 'introDescription'),
    d.description ?? null,
  );
  const introTitle = pickFirstNonEmptyString(readString(raw, 'introTitle'));

  const galleryImages = pickFirstNonEmptyStringArray(
    readStringArray(raw, 'gallery'),
    readStringArray(raw, 'galleryUrls'),
    legacyGallery.length ? legacyGallery : null,
  );

  const visitHours = pickFirstNonEmptyRecord(
    readHoursRecord(raw, 'visitHours'),
    readHoursRecord(raw, 'openingHours'),
    legacyOpening ?? null,
  );

  const visitingRules = pickFirstNonEmptyString(readString(raw, 'visitingRules'), readString(raw, 'visitRules'));

  const collectionsItems = pickFirstNonEmptyStringArray(parsed.collections ?? null);
  const currentExhibitions = pickFirstNonEmptyString(
    parsed.currentExhibitions ?? null,
    readString(raw, 'currentExhibitionsIntro'),
  );
  const permanentExpositionText = pickFirstNonEmptyString(parsed.permanentExhibitions ?? null);
  const accessibilityNotes = pickFirstNonEmptyString(parsed.accessibilityNotes ?? null);

  const faqItems = pickFirstNonEmptyFaqArray(readFaqArray(raw, 'faq'), legacyFaq);

  const eventsTitle = pickFirstNonEmptyString(readString(raw, 'eventsTitle'));
  const eventsIntro = pickFirstNonEmptyString(readString(raw, 'eventsIntro'));

  const mergedHighlights = pickFirstNonEmptyStringArray(
    readStringArray(raw, 'highlights'),
    readStringArray(raw, 'templateHighlights'),
    legacyHighlights,
  );

  const amenitiesItems = pickFirstNonEmptyStringArray(
    readStringArray(raw, 'amenitiesList'),
    readStringArray(raw, 'amenityList'),
  );
  const amenitiesText = pickFirstNonEmptyString(readString(raw, 'amenities'), readString(raw, 'amenitiesNote'));

  const sections: VenuePublicTemplateSections = {};
  if (introTitle || introLead || introLongDescription || mergedHighlights) {
    sections.intro = {
      title: introTitle,
      lead: introLead,
      longDescription: introLongDescription,
      ...(mergedHighlights ? { highlights: mergedHighlights } : {}),
    };
  }
  if (galleryImages) sections.gallery = { images: galleryImages };
  if (visitHours || visitingRules) {
    sections.visitInfo = { openingHours: visitHours, visitingRules: visitingRules ?? undefined };
  }
  if (collectionsItems || currentExhibitions) {
    sections.collections = { items: collectionsItems ?? undefined, text: currentExhibitions ?? undefined };
  }
  if (permanentExpositionText) sections.permanentExposition = { text: permanentExpositionText };
  if (parsed.audioGuide !== undefined || parsed.interactive !== undefined || accessibilityNotes) {
    sections.accessibility = {
      audioGuide: parsed.audioGuide ?? null,
      interactive: parsed.interactive ?? null,
      notes: accessibilityNotes ?? null,
    };
  }
  if (faqItems) sections.faq = { items: faqItems };
  if (eventsTitle || eventsIntro) sections.eventsCopy = { title: eventsTitle, intro: eventsIntro };
  if (amenitiesItems || amenitiesText) {
    sections.amenities = {
      ...(amenitiesItems ? { items: amenitiesItems } : {}),
      ...(amenitiesText ? { text: amenitiesText } : {}),
    };
  }

  const hasAnySection = Object.keys(sections).length > 0;
  if (!hasAnySection && !supportedTemplateType) return null;
  return {
    venueType,
    supportedTemplateType,
    sections,
  };
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

function firstNonEmptyFaq(...values: Array<Array<{ q: string; a: string }> | null | undefined>): Array<{ q: string; a: string }> {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    const normalized = value
      .map((item) => ({ q: item.q?.trim() ?? '', a: item.a?.trim() ?? '' }))
      .filter((item) => item.q && item.a);
    if (normalized.length > 0) return normalized;
  }
  return [];
}

function firstNonEmptyHours(...values: Array<Record<string, string | null> | null | undefined>): Record<string, string | null> | null {
  for (const value of values) {
    if (!value || typeof value !== 'object') continue;
    if (Object.keys(value).length > 0) return value;
  }
  return null;
}

function buildAccessibility(section: {
  audioGuide?: boolean | null;
  interactive?: boolean | null;
  notes?: string | null;
} | null): { audioGuide: boolean; interactive: boolean; notes: string | null } | null {
  const audioGuide = Boolean(section?.audioGuide);
  const interactive = Boolean(section?.interactive);
  const notes = firstNonEmptyString(section?.notes ?? null);
  if (!audioGuide && !interactive && !notes) return null;
  return { audioGuide, interactive, notes };
}

function buildAmenities(section: { items?: string[] | null; text?: string | null } | null | undefined): {
  items: string[];
  text: string | null;
} | null {
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

/** Как на витрине: сводка секций для отображения в админке */
export function buildVenueTemplateSectionsForAdmin(venue: {
  template?: VenuePublicTemplate | null;
  shortDescription?: string | null;
  description?: string | null;
  highlights?: string[] | null;
  galleryUrls?: string[];
  openingHours?: Record<string, string | null> | null;
  faq?: Array<{ q: string; a: string }> | null;
}): BuiltVenueTemplateSections {
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

  const accessibility = buildAccessibility(sections?.accessibility ?? null);
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

export function getVenueTemplatePreview(d: AdminVenueDetail): BuiltVenueTemplateSections | null {
  const template = buildVenuePublicTemplateFromAdmin(d);
  const highlights = Array.isArray(d.highlights) ? (d.highlights as string[]) : undefined;
  const faq = Array.isArray(d.faq) ? (d.faq as Array<{ q: string; a: string }>) : undefined;
  const openingHours = d.openingHours as Record<string, string | null> | null | undefined;

  const built = buildVenueTemplateSectionsForAdmin({
    template,
    shortDescription: d.shortDescription,
    description: d.description,
    highlights: highlights ?? null,
    galleryUrls: d.galleryUrls ?? [],
    openingHours: openingHours ?? null,
    faq: faq ?? null,
  });

  const hasAny =
    built.heroTitle ||
    built.introLead ||
    built.descriptionHtml ||
    built.highlights.length ||
    built.galleryUrls.length ||
    built.openingHours ||
    built.visitingRules ||
    built.collections.length ||
    built.collectionsText ||
    built.permanentExposition ||
    built.accessibility ||
    built.amenities ||
    built.faq.length ||
    built.eventsCopy;

  if (!hasAny) return null;
  return built;
}
