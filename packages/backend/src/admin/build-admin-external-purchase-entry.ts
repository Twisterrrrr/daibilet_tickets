import { validateWidgetPayload } from '@daibilet/shared';
import { EventSource, OfferStatus, Prisma, PurchaseType } from '@/prisma-client';

/**
 * Additive read-model для `GET /api/v1/admin/events/:id` — витрина продаёт через провайдера
 * (виджет/deeplink), не через internal checkout. См. `docs/product/admin-v4-imported-sales.md` (часть A).
 */
export type AdminExternalPurchaseEntryDto = {
  provider: 'TICKETSCLOUD' | 'TEPLOHOD' | 'UNKNOWN';
  entryType: 'WIDGET' | 'DEEPLINK' | 'NONE';
  widgetPayload?: Record<string, unknown> | null;
  deeplink?: string | null;
  isConfigured: boolean;
  isValid: boolean;
  status: 'READY' | 'MISSING' | 'INVALID' | 'DISABLED' | 'PROVIDER_UNSUPPORTED';
  blockingReasons: string[];
};

type OfferRow = {
  purchaseType: PurchaseType;
  deeplink: string | null;
  widgetPayload: Prisma.JsonValue;
  status: OfferStatus;
  isDeleted: boolean;
  isPrimary: boolean;
  priority: number;
  widgetProvider: string | null;
};

function sourceToProvider(source: EventSource): AdminExternalPurchaseEntryDto['provider'] {
  if (source === EventSource.TC) return 'TICKETSCLOUD';
  if (source === EventSource.TEPLOHOD) return 'TEPLOHOD';
  return 'UNKNOWN';
}

export function pickPrimaryOffer(offers: OfferRow[]): OfferRow | null {
  const active = offers.filter((o) => !o.isDeleted && o.status === OfferStatus.ACTIVE);
  if (active.length === 0) return null;
  active.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return b.priority - a.priority;
  });
  return active[0] ?? null;
}

function safeUrlValid(href: string | null | undefined): boolean {
  if (!href || !String(href).trim()) return false;
  try {
    const u = new URL(String(href).trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Собирает `externalPurchaseEntry` из фактов EventOffer (без internal order / cart).
 */
export function buildAdminExternalPurchaseEntry(
  event: { source: EventSource; offers?: OfferRow[] | null },
): AdminExternalPurchaseEntryDto {
  const provider = sourceToProvider(event.source);
  const offers = (event.offers ?? []) as OfferRow[];
  const pick = pickPrimaryOffer(offers);

  if (!pick) {
    return {
      provider,
      entryType: 'NONE',
      widgetPayload: null,
      deeplink: null,
      isConfigured: false,
      isValid: false,
      status: 'MISSING',
      blockingReasons: ['NO_ACTIVE_OFFER'],
    };
  }

  const entryType: AdminExternalPurchaseEntryDto['entryType'] =
    pick.purchaseType === PurchaseType.WIDGET
      ? 'WIDGET'
      : pick.purchaseType === PurchaseType.REDIRECT
        ? 'DEEPLINK'
        : 'NONE';

  const rawPayload = pick.widgetPayload;
  const widgetPayload =
    rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)
      ? (rawPayload as Record<string, unknown>)
      : null;
  const deeplink = pick.deeplink?.trim() ? pick.deeplink.trim() : null;

  if (entryType === 'NONE') {
    return {
      provider,
      entryType: 'NONE',
      widgetPayload: null,
      deeplink: null,
      isConfigured: false,
      isValid: false,
      status: 'PROVIDER_UNSUPPORTED',
      blockingReasons: ['PURCHASE_TYPE_NOT_WIDGET_OR_REDIRECT'],
    };
  }

  if (entryType === 'WIDGET') {
    const isConfigured = Boolean(widgetPayload && Object.keys(widgetPayload).length > 0);
    const v = validateWidgetPayload(pick.widgetProvider, widgetPayload);
    const isValid = v.valid;
    const blockingReasons: string[] = [];
    if (!isConfigured) blockingReasons.push('MISSING_WIDGET_PAYLOAD');
    if (isConfigured && !isValid) blockingReasons.push(...(v.errors ?? ['INVALID_WIDGET_PAYLOAD']));
    let status: AdminExternalPurchaseEntryDto['status'] = 'READY';
    if (!isConfigured) status = 'MISSING';
    else if (!isValid) status = 'INVALID';
    return {
      provider,
      entryType: 'WIDGET',
      widgetPayload: isConfigured ? widgetPayload : null,
      deeplink: null,
      isConfigured,
      isValid,
      status,
      blockingReasons: blockingReasons.length ? blockingReasons : [],
    };
  }

  // DEEPLINK
  const isConfigured = safeUrlValid(deeplink);
  const isValid = isConfigured;
  const blockingReasons: string[] = [];
  if (!deeplink) blockingReasons.push('MISSING_DEEPLINK');
  else if (!isValid) blockingReasons.push('INVALID_DEEPLINK');
  const status: AdminExternalPurchaseEntryDto['status'] = !deeplink ? 'MISSING' : !isValid ? 'INVALID' : 'READY';
  return {
    provider,
    entryType: 'DEEPLINK',
    widgetPayload: null,
    deeplink: deeplink ?? null,
    isConfigured,
    isValid,
    status,
    blockingReasons: blockingReasons.length ? blockingReasons : [],
  };
}

/** Для списка событий: тот же контракт, но без тела виджета (меньше пейлоад). */
export function slimExternalPurchaseEntryForList(entry: AdminExternalPurchaseEntryDto): AdminExternalPurchaseEntryDto {
  return {
    ...entry,
    widgetPayload: null,
  };
}
