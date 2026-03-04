/**
 * Combo VM и нормализаторы: LandingItem/DTO → UI.
 */

import type { EventListItem } from '@daibilet/shared';
import type { LandingItem } from '@/lib/api.types';

function toArray<T>(x: T[] | null | undefined | unknown): T[] {
  return Array.isArray(x) ? (x as T[]) : [];
}

function toCity(x: unknown): { slug: string; name: string } | null {
  if (!x || typeof x !== 'object') return null;
  const r = x as Record<string, unknown>;
  return typeof r.slug === 'string' && typeof r.name === 'string'
    ? { slug: r.slug, name: r.name }
    : null;
}

/** Combo list card VM */
export interface ComboListVM {
  slug: string;
  title: string;
  coverUrl?: string | null;
  city?: { slug: string; name: string } | null;
  dayCount?: number | null;
  priceFrom?: number | null;
  suggestedPrice?: number | null;
  subtitle?: string | null;
  intensity?: string | null;
  features?: Array<{ icon?: string; title?: string }>;
}

export function toComboListVM(item: LandingItem | Record<string, unknown>): ComboListVM {
  const r = item as Record<string, unknown>;
  const city = toCity(r.city);
  return {
    slug: typeof r.slug === 'string' ? r.slug : '',
    title: typeof r.title === 'string' ? r.title : '',
    coverUrl: typeof r.coverUrl === 'string' ? r.coverUrl : (r.imageUrl as string) ?? null,
    city: city ?? undefined,
    dayCount: typeof r.dayCount === 'number' ? r.dayCount : null,
    priceFrom: typeof r.priceFrom === 'number' ? r.priceFrom : null,
    suggestedPrice: typeof r.suggestedPrice === 'number' ? r.suggestedPrice : null,
    subtitle: typeof r.subtitle === 'string' ? r.subtitle : null,
    intensity: typeof r.intensity === 'string' ? r.intensity : null,
    features: toArray(r.features).map((f) => {
      const ff = f as Record<string, unknown>;
      return {
        icon: typeof ff.icon === 'string' ? ff.icon : undefined,
        title: typeof ff.title === 'string' ? ff.title : undefined,
      };
    }),
  };
}

/** Combo slot VM — нормализованные поля из API */
export interface ComboSlotVM {
  slot?: string;
  time?: string;
  event?: EventListItem | null;
  session?: { availableTickets?: number } | null;
  adultPrice?: number;
  subtotal?: number;
}

function toComboSlotVM(s: unknown): ComboSlotVM | null {
  if (!s || typeof s !== 'object') return null;
  const r = s as Record<string, unknown>;
  const ev = r.event;
  const session = r.session;
  return {
    slot: typeof r.slot === 'string' ? r.slot : undefined,
    time: typeof r.time === 'string' ? r.time : undefined,
    event: ev && typeof ev === 'object' ? (ev as EventListItem) : null,
    session: session && typeof session === 'object' ? (session as { availableTickets?: number }) : null,
    adultPrice: typeof r.adultPrice === 'number' ? r.adultPrice : undefined,
    subtotal: typeof r.subtotal === 'number' ? r.subtotal : undefined,
  };
}

/** Combo day VM */
export interface ComboDayVM {
  dayNumber: number;
  slots: ComboSlotVM[];
}

/** Combo detail VM */
export interface ComboDetailVM {
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  city: { slug: string; name: string };
  dayCount: number;
  suggestedPrice?: number | null;
  pricing?: {
    basePrice: number;
    serviceFee: number;
    markup: number;
    grandTotal: number;
    perPerson: number;
  } | null;
  features: Array<{ icon?: string; title?: string; text?: string }>;
  includes: string[];
  faq: Array<{ question: string; answer: string }>;
  days: ComboDayVM[];
  upsells: Array<{ id?: string; name?: string; priceKopecks?: number; icon?: string; description?: string }>;
}

export function toComboDetailVM(data: LandingItem | Record<string, unknown>): ComboDetailVM {
  const r = data as Record<string, unknown>;
  const city = toCity(r.city);
  const defaultCity = { slug: '', name: '' };
  const daysRaw = toArray(r.days);
  const days: ComboDayVM[] = daysRaw.map((d) => {
    const dd = d as Record<string, unknown>;
    const dayNumber = typeof dd.dayNumber === 'number' ? dd.dayNumber : 0;
    const slotsRaw = toArray(dd.slots);
    const slots = slotsRaw.map(toComboSlotVM).filter((s): s is ComboSlotVM => s != null);
    return { dayNumber, slots };
  });

  const faqRaw = toArray(r.faq);
  const faq = faqRaw
    .filter((i): i is Record<string, unknown> => i != null && typeof i === 'object')
    .map((i) => ({
      question: String(i.question ?? ''),
      answer: String(i.answer ?? ''),
    }))
    .filter((f) => f.question || f.answer);

  const includesRaw = toArray(r.includes);
  const includes = includesRaw.filter((x): x is string => typeof x === 'string');

  const featuresRaw = toArray(r.features);
  const features = featuresRaw
    .filter((i): i is Record<string, unknown> => i != null && typeof i === 'object')
    .map((i) => ({
      icon: typeof i.icon === 'string' ? i.icon : undefined,
      title: typeof i.title === 'string' ? i.title : undefined,
      text: typeof i.text === 'string' ? i.text : undefined,
    }));

  const upsellsRaw = toArray(r.upsells);
  const upsells = upsellsRaw
    .filter((i): i is Record<string, unknown> => i != null && typeof i === 'object')
    .map((i) => ({
      id: typeof i.id === 'string' ? i.id : undefined,
      name: typeof i.name === 'string' ? i.name : undefined,
      priceKopecks: typeof i.priceKopecks === 'number' ? i.priceKopecks : undefined,
      icon: typeof i.icon === 'string' ? i.icon : undefined,
      description: typeof i.description === 'string' ? i.description : undefined,
    }));

  const pricing = r.pricing;
  let pricingVal: ComboDetailVM['pricing'] = null;
  if (pricing && typeof pricing === 'object') {
    const p = pricing as Record<string, unknown>;
    if (
      typeof p.basePrice === 'number' &&
      typeof p.serviceFee === 'number' &&
      typeof p.markup === 'number' &&
      typeof p.grandTotal === 'number' &&
      typeof p.perPerson === 'number'
    ) {
      pricingVal = {
        basePrice: p.basePrice,
        serviceFee: p.serviceFee,
        markup: p.markup,
        grandTotal: p.grandTotal,
        perPerson: p.perPerson,
      };
    }
  }

  return {
    slug: typeof r.slug === 'string' ? r.slug : '',
    title: typeof r.title === 'string' ? r.title : '',
    subtitle: typeof r.subtitle === 'string' ? r.subtitle : null,
    description: typeof r.description === 'string' ? r.description : null,
    city: city ?? defaultCity,
    dayCount: typeof r.dayCount === 'number' ? r.dayCount : 0,
    suggestedPrice: typeof r.suggestedPrice === 'number' ? r.suggestedPrice : null,
    pricing: pricingVal,
    features,
    includes,
    faq,
    days,
    upsells,
  };
}
