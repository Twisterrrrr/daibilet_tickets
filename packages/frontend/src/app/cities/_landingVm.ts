/**
 * Landing VM и нормализаторы: DTO → UI для cities/landing pages.
 */

import type { LandingPageResponse } from '@/lib/api.types';

function parsePrimarySubcategory(raw: unknown): { code: string; nameRu: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.code !== 'string' || typeof o.nameRu !== 'string') return null;
  return { code: o.code, nameRu: o.nameRu };
}

/** Нормализатор: в массив по умолчанию */
function toArray<T>(x: T[] | null | undefined | unknown): T[] {
  return Array.isArray(x) ? (x as T[]) : [];
}

/** Нормализатор city из unknown */
function toCity(x: unknown): { slug: string; name: string } | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  return typeof r.slug === 'string' && typeof r.name === 'string'
    ? { slug: r.slug, name: r.name }
    : null;
}

/** LandingClient Variant (session + event + prices) */
export interface LandingVariant {
  sessionId: string;
  startsAt: string;
  endsAt?: string;
  availableTickets: number;
  prices: Array<{ type: string; amount?: number; price?: number }>;
  event: {
    id: string;
    title: string;
    slug: string;
    address?: string;
    durationMinutes?: number;
    imageUrl?: string;
    tcEventId: string;
    source: string;
    rating: number;
    reviewCount: number;
    priceFrom?: number;
    shortDescription?: string | null;
    /** Коды подкатегорий (EventSubcategory) для фасетов/иконок */
    subcategories?: string[];
    primarySubcategory?: { code: string; nameRu: string } | null;
    vesselName?: string;
    experienceFormat?: string;
    catering?: {
      enabled: boolean;
      type?: string | null;
      includedInPrice?: boolean | null;
      menuMarkdown?: string | null;
    };
  };
}

/** LandingClient Filters */
export interface LandingFilters {
  piers: string[];
  priceRange: [number, number];
  dateRange: string[];
  dates: string[];
  menuKinds: string[];
  experienceFormats: string[];
}

function toVariant(x: unknown): LandingVariant | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  const ev = r.event;
  if (!ev || typeof ev !== 'object') return null;
  const e = ev as Record<string, unknown>;
  const sessionId = typeof r.sessionId === 'string' ? r.sessionId : '';
  const startsAt = typeof r.startsAt === 'string' ? r.startsAt : '';
  const availableTickets = typeof r.availableTickets === 'number' ? r.availableTickets : 0;
  const prices = toArray(r.prices).map((p) => {
    const pp = p as Record<string, unknown>;
    return {
      type: typeof pp.type === 'string' ? pp.type : '',
      amount: typeof pp.amount === 'number' ? pp.amount : undefined,
      price: typeof pp.price === 'number' ? pp.price : undefined,
    };
  });
  return {
    sessionId,
    startsAt,
    endsAt: typeof r.endsAt === 'string' ? r.endsAt : undefined,
    availableTickets,
    prices,
    event: {
      id: typeof e.id === 'string' ? e.id : '',
      title: typeof e.title === 'string' ? e.title : '',
      slug: typeof e.slug === 'string' ? e.slug : '',
      address: typeof e.address === 'string' ? e.address : undefined,
      durationMinutes: typeof e.durationMinutes === 'number' ? e.durationMinutes : undefined,
      imageUrl: typeof e.imageUrl === 'string' ? e.imageUrl : undefined,
      tcEventId: typeof e.tcEventId === 'string' ? e.tcEventId : '',
      source: typeof e.source === 'string' ? e.source : '',
      rating: typeof e.rating === 'number' ? e.rating : 0,
      reviewCount: typeof e.reviewCount === 'number' ? e.reviewCount : 0,
      priceFrom: typeof e.priceFrom === 'number' ? e.priceFrom : undefined,
      shortDescription: typeof e.shortDescription === 'string' ? e.shortDescription : null,
      subcategories: Array.isArray(e.subcategories)
        ? e.subcategories.filter((c): c is string => typeof c === 'string')
        : [],
      primarySubcategory: parsePrimarySubcategory(e.primarySubcategory),
      vesselName: typeof e.vesselName === 'string' ? e.vesselName : undefined,
      experienceFormat: typeof e.experienceFormat === 'string' ? e.experienceFormat : undefined,
      catering:
        e.catering && typeof e.catering === 'object'
          ? {
              enabled: Boolean((e.catering as Record<string, unknown>).enabled),
              type:
                typeof (e.catering as Record<string, unknown>).type === 'string'
                  ? ((e.catering as Record<string, unknown>).type as string)
                  : null,
              includedInPrice:
                typeof (e.catering as Record<string, unknown>).includedInPrice === 'boolean'
                  ? ((e.catering as Record<string, unknown>).includedInPrice as boolean)
                  : null,
              menuMarkdown:
                typeof (e.catering as Record<string, unknown>).menuMarkdown === 'string'
                  ? ((e.catering as Record<string, unknown>).menuMarkdown as string)
                  : null,
            }
          : { enabled: false, type: null, includedInPrice: null, menuMarkdown: null },
    },
  };
}

function toFilters(x: unknown): LandingFilters {
  if (!x || typeof x !== 'object') {
    return {
      piers: [],
      priceRange: [0, Number.POSITIVE_INFINITY],
      dateRange: [],
      dates: [],
      menuKinds: [],
      experienceFormats: [],
    };
  }
  const r = x as Record<string, unknown>;
  const piers = toArray(r.piers).filter((p): p is string => typeof p === 'string');
  const pr = r.priceRange;
  const priceRange: [number, number] =
    Array.isArray(pr) && pr.length >= 2 && typeof pr[0] === 'number' && typeof pr[1] === 'number'
      ? [pr[0], pr[1]]
      : [0, Number.POSITIVE_INFINITY];
  const dateRange = toArray(r.dateRange).filter((d): d is string => typeof d === 'string');
  const dates = toArray(r.dates).filter((d): d is string => typeof d === 'string');
  const menuKinds = toArray(r.menuKinds).filter((x): x is string => typeof x === 'string');
  const experienceFormats = toArray(r.experienceFormats).filter((x): x is string => typeof x === 'string');
  return { piers, priceRange, dateRange, dates, menuKinds, experienceFormats };
}

export interface HowToChooseItemVM {
  title: string;
  text: string;
}

function toHowToChooseItems(x: unknown): HowToChooseItemVM[] {
  return toArray(x)
    .filter((i): i is Record<string, unknown> => i != null && typeof i === 'object')
    .map((i) => ({ title: String(i.title ?? ''), text: String(i.text ?? '') }))
    .filter((i) => i.title || i.text);
}

export interface InfoBlockVM {
  title: string;
  text: string;
}

function toInfoBlocks(x: unknown): InfoBlockVM[] {
  return toArray(x)
    .filter((i): i is Record<string, unknown> => i != null && typeof i === 'object')
    .map((i) => ({ title: String(i.title ?? ''), text: String(i.text ?? '') }))
    .filter((i) => i.title || i.text);
}

export interface FaqItemVM {
  question: string;
  answer: string;
}

function toFaqItems(x: unknown): FaqItemVM[] {
  return toArray(x)
    .filter((i): i is Record<string, unknown> => i != null && typeof i === 'object')
    .map((i) => ({ question: String(i.question ?? ''), answer: String(i.answer ?? '') }))
    .filter((i) => i.question || i.answer);
}

export interface ReviewItemVM {
  text: string;
  author: string;
  rating: number;
}

function toReviewItems(x: unknown): ReviewItemVM[] {
  return toArray(x)
    .filter((i): i is Record<string, unknown> => i != null && typeof i === 'object')
    .map((i) => ({
      text: String(i.text ?? ''),
      author: String(i.author ?? ''),
      rating: typeof i.rating === 'number' ? i.rating : 0,
    }))
    .filter((i) => i.text || i.author);
}

export interface RelatedLinkItemVM {
  title: string;
  href: string;
}

function toRelatedLinks(x: unknown): RelatedLinkItemVM[] {
  return toArray(x)
    .filter((i): i is Record<string, unknown> => i != null && typeof i === 'object')
    .map((i) => ({ title: String(i.title ?? ''), href: String(i.href ?? '') }))
    .filter((i) => i.href);
}

export interface LandingVM {
  city: { slug: string; name: string } | null;
  templateType: 'GENERIC_CARDS' | 'COMPARISON_TABLE' | 'HYBRID' | 'SEASONAL_EVENT';
  title: string;
  description?: string | null;
  subtitle?: string | null;
  variants: LandingVariant[];
  filters: LandingFilters;
  howToChoose: HowToChooseItemVM[];
  blocks: InfoBlockVM[];
  faq: FaqItemVM[];
  reviews: ReviewItemVM[];
  relatedLinks: RelatedLinkItemVM[];
  stats?: { totalSold?: number; soldTickets?: number; avgRating?: number } | null;
  legalText?: string | null;
}

export function toLandingVM(data: LandingPageResponse): {
  vm: LandingVM;
  total: number;
} {
  const landing = data.landing;
  const city = toCity(landing.city);
  const variants = toArray(data.variants)
    .map(toVariant)
    .filter((v): v is LandingVariant => v != null);
  const filters = toFilters(data.filters);

  return {
    total: typeof data.total === 'number' ? data.total : 0,
    vm: {
      city,
      templateType:
        (landing.templateType as LandingVM['templateType'] | undefined) ?? 'GENERIC_CARDS',
      title: typeof landing.title === 'string' ? landing.title : '',
      description: typeof landing.metaDescription === 'string' ? landing.metaDescription : undefined,
      subtitle: typeof landing.subtitle === 'string' ? landing.subtitle : null,
      variants,
      filters,
      howToChoose: toHowToChooseItems(landing.howToChoose),
      blocks: toInfoBlocks(landing.infoBlocks),
      faq: toFaqItems(landing.faq),
      reviews: toReviewItems(landing.reviews),
      relatedLinks: toRelatedLinks(landing.relatedLinks),
      stats: landing.stats ?? null,
      legalText: typeof landing.legalText === 'string' ? landing.legalText : null,
    },
  };
}

/** Для generateStaticParams: безопасное извлечение city из LandingItem */
export function getLandingCitySlug(item: { city?: unknown; slug: string }): string | null {
  const c = toCity(item.city);
  return c?.slug ?? null;
}

/** Режим чипов времени в фильтрах: ночные мосты / вечерние круизы / закат+ночь (ужин) / скрыть. */
export type LandingTimeSlotMode = 'night' | 'evening' | 'dinner' | 'hidden';

const NIGHT_BRIDGE_LANDING_SLUGS = new Set(['nochnye-mosty']);

const HIDE_TIME_SLOT_LANDING_SLUGS = new Set([
  'meteory',
  'sviyazhsk',
  'kurshskaya-kosa',
  'zolotye-vorota',
  'strelka-i-volga',
  'nizhegorodskij-kreml',
  'kanatnaya-doroga',
  'progulki-po-volge',
  'salute-9-may',
]);

export function landingTimeSlotMode(
  landingSlug: string,
  opts?: { surfaceVariant?: string | null; hasGastroFacets?: boolean },
): LandingTimeSlotMode {
  if (
    opts?.surfaceVariant === 'GASTRO_TABLE' ||
    opts?.surfaceVariant === 'DINNER_CRUISE' ||
    opts?.hasGastroFacets
  ) {
    return 'dinner';
  }
  if (NIGHT_BRIDGE_LANDING_SLUGS.has(landingSlug)) return 'night';
  if (HIDE_TIME_SLOT_LANDING_SLUGS.has(landingSlug)) return 'hidden';
  return 'evening';
}

/** Есть ли в сыром ответе каталога поля гастро-фасетов (до toLandingVM). */
export function rawCatalogVariantsHaveGastroFacets(variants: unknown): boolean {
  if (!Array.isArray(variants)) return false;
  return variants.some((v) => {
    if (!v || typeof v !== 'object') return false;
    const ev = (v as { event?: unknown }).event;
    if (!ev || typeof ev !== 'object') return false;
    const e = ev as Record<string, unknown>;
    const c = e.catering;
    const catering =
      c && typeof c === 'object' ? (c as Record<string, unknown>) : null;
    return Boolean(
      e.experienceFormat ??
        e.vesselName ??
        (catering ? catering.enabled ?? catering.type ?? catering.menuMarkdown : null),
    );
  });
}

export function shouldShowGastroComparisonColumns(
  templateType: LandingVM['templateType'],
  surfaceVariant: string | null | undefined,
  variants: LandingVariant[],
): boolean {
  const table = templateType === 'COMPARISON_TABLE' || templateType === 'HYBRID';
  if (!table) return false;
  if (surfaceVariant === 'GASTRO_TABLE' || surfaceVariant === 'DINNER_CRUISE') return true;
  return variants.some(
    (v) =>
      Boolean(
        v.event.experienceFormat ||
          v.event.vesselName ||
          v.event.catering?.enabled ||
          v.event.catering?.type ||
          v.event.catering?.menuMarkdown,
      ),
  );
}
