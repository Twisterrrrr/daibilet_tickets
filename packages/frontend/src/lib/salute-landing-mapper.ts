import type { EventListItem } from '@daibilet/shared';
import {
  EventAudience,
  EventCategory,
  EventSubcategory,
  calendarDayFromIso,
  getCityTimezone,
} from '@daibilet/shared';

import type { LandingVariant } from '@/app/cities/_landingVm';
import type { SaluteLandingContent } from '@/components/landing/SaluteLandingPage';
import { saluteContentForCity } from '@/app/salute-9-may/salute-content';
import type { LandingPageResponse } from '@/lib/api.types';

function getVariantPriceKop(v: LandingVariant): number {
  const p = v.prices?.[0];
  const sessionPrice = p?.price ?? p?.amount ?? 0;
  return sessionPrice > 0 ? sessionPrice : (v.event.priceFrom ?? 0);
}

/** Варианты каталожного лендинга → карточки салюта (упрощённая модель каталога). */
export function variantsToSaluteEventListItems(
  variants: LandingVariant[],
  city: { slug: string; name: string },
): EventListItem[] {
  return variants
    .filter((v) => Boolean(v.startsAt))
    .map((v) => ({
      id: v.event.id,
      slug: v.event.slug,
      title: v.event.title,
      category: EventCategory.EXCURSION,
      subcategories: (v.event.subcategories ?? []) as EventSubcategory[],
      audience: EventAudience.FAMILY,
      imageUrl: v.event.imageUrl ?? null,
      priceFrom: getVariantPriceKop(v),
      rating: Number(v.event.rating) || 0,
      reviewCount: v.event.reviewCount ?? 0,
      durationMinutes: v.event.durationMinutes ?? null,
      city,
      totalAvailableTickets: v.availableTickets,
      nextSessionAt: v.startsAt,
      address: v.event.address ?? null,
      shortDescription: v.event.shortDescription ?? null,
    }));
}

/**
 * Средняя оценка для чипа в hero: агрегат лендинга, иначе по событиям, иначе 4.7.
 */
export function saluteHeroAvgRating(events: EventListItem[], statsAvg?: number | null): number {
  if (typeof statsAvg === 'number' && statsAvg > 0) {
    return Math.round(statsAvg * 10) / 10;
  }
  const rated = events.filter((e) => Number(e.rating) > 0);
  if (rated.length === 0) return 4.7;
  const sum = rated.reduce((s, e) => s + Number(e.rating), 0);
  return Math.round((sum / rated.length) * 10) / 10;
}

export function buildSaluteFilterOptionsFromEvents(
  events: EventListItem[],
  citySlug: string,
): { piers: string[]; priceRange: [number, number]; dates: string[] } {
  const piers = [...new Set(events.map((e) => e.address).filter((a): a is string => Boolean(a?.trim())))];
  const prices = events.map((e) => e.priceFrom).filter((p): p is number => typeof p === 'number' && p > 0);
  const priceRange: [number, number] = prices.length ? [Math.min(...prices), Math.max(...prices)] : [0, 0];
  const tz = getCityTimezone(citySlug);
  const dates = [
    ...new Set(
      events
        .map((e) => e.nextSessionAt)
        .filter((d): d is string => typeof d === 'string' && d.length >= 10)
        .map((d) => calendarDayFromIso(d, tz)),
    ),
  ].sort();
  return { piers, priceRange, dates };
}

type SeasonalPayloadShape = {
  seasonWindow?: { startMonthDay?: string; endMonthDay?: string };
  viewpoints?: SaluteLandingContent['viewpoints'];
  tips?: string[];
};

/**
 * Убирает «сегодня» из H1 салюта: событие привязано к 9 мая, не к «сегодня» в календарном смысле.
 */
export function sanitizeSaluteHeroTitle(raw: string): string {
  return raw
    .replace(/\s*сегодня/giu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function catalogLandingToSaluteContent(
  landing: LandingPageResponse['landing'],
  citySlug: string,
): SaluteLandingContent {
  const fb = saluteContentForCity(citySlug);
  const payload = landing.seasonalPayload as SeasonalPayloadShape | null | undefined;

  return {
    heroTitle: sanitizeSaluteHeroTitle(
      typeof landing.title === 'string' ? landing.title : (fb.heroTitle ?? ''),
    ),
    heroSubtitle: typeof landing.subtitle === 'string' ? landing.subtitle : fb.heroSubtitle,
    seoTitle: typeof landing.metaTitle === 'string' ? landing.metaTitle : fb.seoTitle,
    seoDescription: typeof landing.metaDescription === 'string' ? landing.metaDescription : fb.seoDescription,
    introText: typeof landing.heroText === 'string' ? landing.heroText : fb.introText,
    howToChoose:
      Array.isArray(landing.howToChoose) && landing.howToChoose.length > 0
        ? (landing.howToChoose as SaluteLandingContent['howToChoose'])
        : fb.howToChoose,
    infoBlocks: Array.isArray(landing.infoBlocks)
      ? (landing.infoBlocks as SaluteLandingContent['infoBlocks'])
      : fb.infoBlocks,
    faq: Array.isArray(landing.faq) && landing.faq.length > 0 ? (landing.faq as SaluteLandingContent['faq']) : fb.faq,
    reviews:
      Array.isArray(landing.reviews) && landing.reviews.length > 0
        ? (landing.reviews as SaluteLandingContent['reviews'])
        : fb.reviews,
    relatedLinks:
      Array.isArray(landing.relatedLinks) && landing.relatedLinks.length > 0
        ? (landing.relatedLinks as SaluteLandingContent['relatedLinks'])
        : fb.relatedLinks,
    viewpoints: payload?.viewpoints?.length ? payload.viewpoints : fb.viewpoints,
    tips: payload?.tips?.length ? payload.tips : fb.tips,
  };
}
