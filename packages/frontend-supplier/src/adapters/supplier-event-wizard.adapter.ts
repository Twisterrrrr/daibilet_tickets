/**
 * Адаптер EventWizardDraft ↔ контракты supplier API.
 * Преобразует данные мастера в payload для POST /supplier/events и POST /supplier/events/:id/offers,
 * а также обратно — офферы → ticket tiers.
 */

import type {
  EventWizardDraft,
  EventWizardTicketTierDraft,
  EventWizardTicketsDraft,
} from '@daibilet/shared-ui';

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
 * Офферы → Draft.tickets (tiers).
 * Используется при редактировании события поставщиком.
 */
export function buildTicketsFromOffers(offers: any[]): EventWizardTicketsDraft {
  if (!offers || offers.length === 0) {
    return {
      tiers: [],
      pricingMode: 'fixed',
      serviceFeeMode: 'included',
      currency: 'RUB',
    };
  }

  const tiers: EventWizardTicketTierDraft[] = offers
    .filter((o: any) => !o.isDeleted)
    .sort((a: any, b: any) => (a.priority ?? 0) - (b.priority ?? 0))
    .map((o: any, idx: number) => ({
      id: o.id, // существующие офферы — реальные UUID
      name: o.badge || `Тариф ${idx + 1}`,
      description: '',
      priceMinor: o.priceFrom ?? 0,
      currency: 'RUB',
      quantityLimit: null,
      purchaseType: o.purchaseType,
      deeplink: o.deeplink ?? null,
      commissionPercent: o.commissionPercent ?? null,
      availabilityMode: o.availabilityMode ?? null,
      badge: o.badge ?? null,
      isPrimary: !!o.isPrimary || idx === 0,
    }));

  return {
    tiers,
    pricingMode: 'fixed',
    serviceFeeMode: 'included',
    currency: 'RUB',
  };
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

/**
 * Дифф офферов: оригинальные офферы ↔ tiers из draft.
 * Используется в режиме edit, чтобы безопасно синхронизировать билеты.
 */
export interface OffersDiff {
  toCreate: SupplierCreateOfferPayload[];
  toUpdate: { id: string; payload: SupplierCreateOfferPayload }[];
  toDelete: string[];
}

export function diffOffers(originalOffers: any[], draft: EventWizardDraft): OffersDiff {
  const originalById = new Map<string, any>(
    (originalOffers || []).filter(Boolean).map((o: any) => [o.id as string, o]),
  );
  const tiers = draft.tickets.tiers;

  const toCreate: SupplierCreateOfferPayload[] = [];
  const toUpdate: { id: string; payload: SupplierCreateOfferPayload }[] = [];
  const seenIds = new Set<string>();

  tiers.forEach((tier, index) => {
    const payload: SupplierCreateOfferPayload = {
      source: 'MANUAL',
      purchaseType: tier.purchaseType || 'REQUEST',
      deeplink: tier.deeplink || undefined,
      priceFrom: tier.priceMinor > 0 ? tier.priceMinor : undefined,
      priority: index,
      badge: tier.badge || undefined,
      commission: tier.commissionPercent ?? undefined,
    };

    const existing = tier.id ? originalById.get(tier.id) : null;

    if (!existing) {
      // новый tier (temp-id или без id) → создаём оффер
      toCreate.push(payload);
    } else {
      seenIds.add(tier.id as string);

      const changed =
        existing.purchaseType !== payload.purchaseType ||
        existing.deeplink !== payload.deeplink ||
        (existing.priceFrom ?? undefined) !== payload.priceFrom ||
        (existing.priority ?? 0) !== (payload.priority ?? 0) ||
        existing.badge !== payload.badge ||
        (existing.commissionPercent ?? undefined) !== payload.commission;

      if (changed) {
        toUpdate.push({ id: tier.id as string, payload });
      }
    }
  });

  const toDelete = (originalOffers || [])
    .filter((o: any) => !seenIds.has(o.id as string))
    .map((o: any) => o.id as string);

  return { toCreate, toUpdate, toDelete };
}

// ────────────────────────────────────────────────────────────
// Schedule adapters (sessions ↔ wizardDraft.schedule)
// ────────────────────────────────────────────────────────────

export interface SupplierSessionDto {
  id: string;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
  soldTickets: number;
}

export function buildScheduleFromSessions(sessions: SupplierSessionDto[] | null | undefined): EventWizardDraft['schedule'] {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const futureActive = safeSessions.filter((s) => !!s.startsAt);
  // Храним в draft ISO‑дату (UTC); EventScheduleStep показывает локальное время.
  const startsAtList = futureActive
    .map((s) => {
      const d = new Date(s.startsAt);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    })
    .filter((s): s is string => !!s);

  return {
    mode: 'single',
    timezone: 'Europe/Moscow',
    startsAtList,
    recurrenceRule: null,
    exceptions: {
      removedStartsAt: [],
      movedStartsAt: [],
    },
    salesPolicy: {
      stopSalesBeforeMinutes: null,
      salesStartAt: null,
      salesEndAt: null,
    },
  };
}

export function diffSessions(
  originalSessions: SupplierSessionDto[] | null | undefined,
  draft: EventWizardDraft,
): Array<{ id?: string; startsAt: string; endsAt?: string | null; capacity?: number | null }> {
  const byStartsAt = new Map<string, SupplierSessionDto>();
  for (const s of originalSessions || []) {
    if (!s.startsAt) continue;
    const d = new Date(s.startsAt);
    if (Number.isNaN(d.getTime())) continue;
    byStartsAt.set(d.toISOString(), s);
  }

  const result: Array<{ id?: string; startsAt: string; endsAt?: string | null; capacity?: number | null }> = [];
  const desired = draft.schedule.startsAtList || [];

  for (const raw of desired) {
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const iso = d.toISOString();
    const existing = byStartsAt.get(iso);
    if (existing) {
      result.push({
        id: existing.id,
        startsAt: iso,
        endsAt: existing.endsAt ?? null,
        capacity: existing.capacity ?? null,
      });
    } else {
      result.push({
        startsAt: iso,
      });
    }
  }

  return result;
}

/**
 * Собирает EventWizardDraft для редактирования события поставщика
 * по ответу GET /supplier/events/:id.
 */
export function buildDraftFromSupplierEvent(event: any): EventWizardDraft {
  return {
    mode: 'edit',
    eventId: event.id ?? null,
    basics: {
      title: event.title || '',
      slug: event.slug || '',
      category: event.category || 'EXCURSION',
      cityId: event.cityId || '',
      venueId: event.venueId || null,
      supplierId: null,
      shortDescription: event.shortDescription || '',
      fullDescription: event.description || '',
      coverImageUrl: event.imageUrl || '',
      gallery: Array.isArray(event.galleryUrls) ? event.galleryUrls : [],
      locationChoice: 'existing',
      startLocationId: '',
      locationProposalTitle: '',
      locationProposalAddress: '',
      locationProposalType: '',
    },
    schedule: {
      mode: 'single',
      timezone: 'Europe/Moscow',
      startsAtList: [],
      recurrenceRule: null,
      exceptions: {
        removedStartsAt: [],
        movedStartsAt: [],
      },
      salesPolicy: {
        stopSalesBeforeMinutes: null,
        salesStartAt: null,
        salesEndAt: null,
      },
    },
    tickets: {
      tiers: [],
      pricingMode: 'fixed',
      serviceFeeMode: 'included',
      currency: 'RUB',
    },
    capacity: {
      eventCapacity: null,
      perSessionCapacityEnabled: false,
      oversellAllowed: false,
      holdTimeoutMinutes: null,
    },
    publishing: {
      status: 'draft',
      visibility: 'hidden',
      moderationNotes: '',
    },
    sourceMeta: {
      sourceType: 'native',
      externalId: null,
      lockedFields: [],
    },
  };
}
