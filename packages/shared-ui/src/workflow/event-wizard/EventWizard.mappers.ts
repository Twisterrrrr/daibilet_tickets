import type { EventWizardDraft } from './EventWizard.types';

/**
 * ВНИМАНИЕ: эти мапперы завязаны на текущие контракты Daibilet admin.
 * Здесь нельзя менять форму payload'ов — только адаптировать draft к уже существующим API.
 *
 * Все TODO ниже нужно заполнять TOLERANT‑образом, сверяясь с:
 * - EventCreatePage (pages/events/EventCreate.tsx)
 * - EventEditPage (pages/events/EventEdit.tsx)
 * - OffersSection / ScheduleTab и родственные API‑вызовы.
 */

// Небольшие локальные типы для документации намерений (НЕ экспортируем наружу).

interface AdminEventDetailLite {
  id: string;
  title: string;
  slug?: string;
  category?: string;
  city?: { id: string };
  cityId?: string;
  venueId?: string | null;
  supplierId?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  imageUrl?: string | null;
  // sessions / offers и прочие поля подтягиваются по мере надобности.
  sessions?: Array<{ startsAt: string }>;
  // При необходимости offers будут подтягиваться, но сейчас контракты не используются в рантайме.
  // Используем unknown[] вместо any[]: безопаснее и соответствует lint.
  offers?: unknown[];
  // source/meta
  source?: string;
  externalId?: string | null;
}

/**
 * mapEventToDraft
 * Преобразует Admin EventDetail → EventWizardDraft для edit‑режима.
 */
export function mapEventToDraft(event: AdminEventDetailLite): EventWizardDraft {
  // TODO: timezone: определять по event.city/timezone или общему дефолту проекта.
  const timezone = 'Europe/Moscow';

  const startsAtList =
    event.sessions?.map((s) => s.startsAt).filter((v): v is string => typeof v === 'string' && v.length > 0) ?? [];

  return {
    mode: 'edit',
    eventId: event.id,

    basics: {
      title: event.title ?? '',
      slug: event.slug ?? '',
      category: event.category ?? '',
      cityId: event.cityId ?? event.city?.id ?? '',
      venueId: event.venueId ?? null,
      supplierId: event.supplierId ?? null,
      shortDescription: event.shortDescription ?? '',
      fullDescription: event.description ?? '',
      coverImageUrl: event.imageUrl ?? '',
      gallery: [], // TODO: map galleryUrls, если появится контракт в EventDetail
    },

    schedule: {
      mode: 'single', // TODO: попытаться вывести режим (single/recurring/manual) на основе сессий
      timezone,
      startsAtList,
      recurrenceRule: null, // TODO: восстановить rule, если он появится в бэкенд‑контракте
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
      sourceType: event.source && event.source !== 'MANUAL' ? 'imported' : 'native',
      externalId: event.externalId ?? null,
      // Для импортированных событий по умолчанию не даём через визард
      // менять структурные поля, которые жёстко завязаны на источник.
      lockedFields:
        event.source && event.source !== 'MANUAL'
          ? ['category', 'cityId', 'supplierId']
          : [],
    },
  };
}

/**
 * mapDraftToCreatePayload
 * Преобразует EventWizardDraft → payload для POST /admin/events.
 *
 * ВАЖНО: payload должен соответствовать тому, что сейчас формирует EventCreatePage.
 * Здесь НЕЛЬЗЯ менять структуру бэкенд‑контракта.
 */
export function mapDraftToCreatePayload(draft: EventWizardDraft): Record<string, unknown> {
  const { basics, schedule: _schedule, tickets } = draft;

  const payload: Record<string, unknown> = {
    title: basics.title,
    // TODO: slug: либо доверять автогенерации на бэке, либо маппить из basics.slug, если контракт это поддерживает.
    cityId: basics.cityId,
    category: basics.category,
    // TODO: audience: взять из basics или оставить по умолчанию ('ALL'), как сейчас в EventCreatePage.
    description: basics.fullDescription || undefined,
    shortDescription: basics.shortDescription || undefined,
    imageUrl: basics.coverImageUrl || undefined,
    // TODO: durationMinutes, address, minAge, templateData — добавить при расширении draft'а.
  };

  // Tickets/offers: high‑level → первый offer payload как в EventCreatePage.
  // Контракт POST /admin/events: offer опционален; при наличии — source и purchaseType обязательны.
  const primaryTier = tickets.tiers.find((t) => t.isPrimary) ?? tickets.tiers[0];
  if (primaryTier) {
    const pt = primaryTier.purchaseType || 'REQUEST';
    const validPurchaseType = ['REQUEST', 'REDIRECT', 'WIDGET'].includes(pt) ? pt : 'REQUEST';
    payload.offer = {
      source: 'MANUAL',
      purchaseType: validPurchaseType,
      deeplink: primaryTier.deeplink || undefined,
      priceFrom: primaryTier.priceMinor && primaryTier.priceMinor > 0 ? primaryTier.priceMinor : undefined,
      commissionPercent: primaryTier.commissionPercent ?? undefined,
      availabilityMode: primaryTier.availabilityMode || undefined,
      badge: primaryTier.badge || undefined,
    };
  }

  // TODO: schedule: на текущем контракте create события нет прямого создания sessions.
  // Генерация сессий должна выполняться отдельным шагом/эндпоинтом (через адаптер), если это требуется.

  return payload;
}

/**
 * mapDraftToUpdatePayload
 * Преобразует EventWizardDraft → payload для обновления события.
 *
 * ВАЖНО: здесь нельзя ломать текущий PATCH/PUT‑контракт EventEditPage.
 * Конкретные поля и эндпоинты придётся уточнять по текущей реализации:
 * - override‑апдейты
 * - SEO/quality
 * - offers/sessions отдельными вызовами.
 */
export function mapDraftToUpdatePayload(draft: EventWizardDraft): Record<string, unknown> {
  const { basics } = draft;

  const payload: Record<string, unknown> = {
    // Минимальный набор для override‑обновления; остальные части (офферы, сессии)
    // будут обновляться через специализированные адаптеры поверх существующих API.
    title: basics.title || undefined,
    slug: basics.slug || undefined,
    category: basics.category || undefined,
    shortDescription: basics.shortDescription || undefined,
    description: basics.fullDescription || undefined,
    imageUrl: basics.coverImageUrl || undefined,
    // TODO: venueId, address, audience, subcategories, minAge, templateData и прочие override‑поля.
  };

  // TODO: вынести tickets/schedule/capacity в отдельные адаптеры, вызывающие
  // текущие эндпоинты (offers*, sessions*, и т.п.), чтобы не смешивать
  // один большой update‑payload с несколькими независимыми контрактами.

  return payload;
}

