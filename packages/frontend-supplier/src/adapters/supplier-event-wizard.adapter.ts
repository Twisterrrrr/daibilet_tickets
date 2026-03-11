/**
 * Адаптер EventWizardDraft → контракты supplier API.
 * Преобразует данные мастера в payload для POST /supplier/events и POST /supplier/events/:id/offers.
 */

import type { EventWizardDraft, EventWizardTicketTierDraft } from '@daibilet/shared-ui';

/** Payload для POST /supplier/events */
export interface SupplierCreateEventPayload {
  title: string;
  cityId: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  audience?: string;
  durationMinutes?: number;
  address?: string;
  imageUrl?: string;
  galleryUrls?: string[];
  priceFrom?: number;
}

/** Payload для POST /supplier/events/:eventId/offers */
export interface SupplierCreateOfferPayload {
  source?: string;
  purchaseType?: string;
  deeplink?: string;
  priceFrom?: number;
  priority?: number;
  badge?: string;
  commission?: number;
}

/**
 * Преобразует draft в payload для создания события поставщика.
 */
export function mapDraftToSupplierCreatePayload(draft: EventWizardDraft): SupplierCreateEventPayload {
  const { basics, tickets } = draft;
  const primaryTier = tickets.tiers.find((t: EventWizardTicketTierDraft) => t.isPrimary) ?? tickets.tiers[0];

  const payload: SupplierCreateEventPayload = {
    title: basics.title,
    cityId: basics.cityId,
    description: basics.fullDescription || undefined,
    shortDescription: basics.shortDescription || undefined,
    category: basics.category || 'EXCURSION',
    audience: 'ALL',
    imageUrl: basics.coverImageUrl || undefined,
    galleryUrls: basics.gallery?.length ? basics.gallery : undefined,
    priceFrom: primaryTier?.priceMinor ?? undefined,
  };

  return payload;
}

/**
 * Преобразует tiers из draft в массив payload для создания офферов.
 * Если tiers пустой — возвращает один оффер по умолчанию (REQUEST, без цены).
 */
export function mapDraftTiersToSupplierOffers(draft: EventWizardDraft): SupplierCreateOfferPayload[] {
  const { tickets } = draft;

  if (tickets.tiers.length === 0) {
    return [{ purchaseType: 'REQUEST', priority: 0 }];
  }

  return tickets.tiers.map((t: EventWizardTicketTierDraft, idx: number) => ({
    source: 'MANUAL',
    purchaseType: t.purchaseType || 'REQUEST',
    deeplink: t.deeplink || undefined,
    priceFrom: t.priceMinor > 0 ? t.priceMinor : undefined,
    priority: idx,
    badge: t.badge || undefined,
    commission: t.commissionPercent ?? undefined,
  }));
}
