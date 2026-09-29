import type { EventOffer, Prisma } from '@/prisma-client';
import { EventSource, OfferStatus, PurchaseType } from '@/prisma-client';

import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';

/** Presentation DTO: «Категории и цены» (persistence: EventOffer). */
export function mapEventOfferToCategoryPriceDto(offer: EventOffer & { _count?: { sessions: number } }): {
  id: string;
  name: string;
  purchaseType: PurchaseType;
  priceFromKopecks: number | null;
  status: OfferStatus;
  isPrimary: boolean;
  priority: number;
  availabilityMode: string | null;
  sessionsLinkedCount: number;
  isSellableHint: boolean;
} {
  const sessionsLinkedCount = offer._count?.sessions ?? 0;
  const pf = offer.priceFrom;
  const isSellableHint = offer.status === 'ACTIVE' && !offer.isDeleted && pf != null && pf > 0;
  return {
    id: offer.id,
    name: String(offer.purchaseType),
    purchaseType: offer.purchaseType,
    priceFromKopecks: pf ?? null,
    status: offer.status,
    isPrimary: offer.isPrimary,
    priority: offer.priority,
    availabilityMode: offer.availabilityMode ?? null,
    sessionsLinkedCount,
    isSellableHint,
  };
}

/**
 * Единая логика «быстрых» сигналов готовности для списка событий и batch health.
 * См. GET /admin/events/health/batch и list() — не дублировать правила рассинхронно.
 */
export function computeAdminEventQuickHealth(input: {
  hasImage: boolean;
  hasPrice: boolean;
  hasFutureSessions: boolean;
  linksCount: number;
  legacySubcategoryCount: number;
}): {
  flags: { hasImage: boolean; hasPrice: boolean; hasFutureSessions: boolean; hasSubcategory: boolean };
  issueCodes: string[];
} {
  const maxSub = SubcategoryPolicyService.MAX_EVENT_SUBCATEGORIES;
  const hasSubcategory = input.linksCount > 0 || input.legacySubcategoryCount > 0;

  const issueCodes: string[] = [];
  if (!input.hasImage) issueCodes.push('NO_PHOTO');
  if (!input.hasPrice) issueCodes.push('NO_PRICE');
  if (!input.hasFutureSessions) issueCodes.push('NO_FUTURE_SESSIONS');
  if (!hasSubcategory) issueCodes.push('NO_SUBCATEGORY');
  if (input.linksCount > maxSub || (input.linksCount === 0 && input.legacySubcategoryCount > maxSub)) {
    issueCodes.push('TOO_MANY_SUBCATEGORIES');
  }

  return {
    flags: {
      hasImage: input.hasImage,
      hasPrice: input.hasPrice,
      hasFutureSessions: input.hasFutureSessions,
      hasSubcategory,
    },
    issueCodes,
  };
}

export function readinessFromIssueCodes(issueCodes: string[]): {
  readinessStatus: 'READY' | 'NEEDS_WORK' | 'BLOCKED';
} {
  const errorCodes = new Set(['NO_PRICE', 'NO_FUTURE_SESSIONS']);
  const errors = issueCodes.filter((c) => errorCodes.has(c)).length;
  const readinessStatus: 'READY' | 'NEEDS_WORK' | 'BLOCKED' =
    issueCodes.length === 0 ? 'READY' : errors > 0 ? 'BLOCKED' : 'NEEDS_WORK';
  return { readinessStatus };
}

/**
 * Score по тем же осям, что и issueCodes (5 базовых проверок + лимит подкатегорий).
 */
export function readinessScoreFromQuickHealth(input: {
  flags: { hasImage: boolean; hasPrice: boolean; hasFutureSessions: boolean; hasSubcategory: boolean };
  issueCodes: string[];
}): number {
  const maxSub = SubcategoryPolicyService.MAX_EVENT_SUBCATEGORIES;
  const tooMany = input.issueCodes.includes('TOO_MANY_SUBCATEGORIES');
  const subOk = input.flags.hasSubcategory && !tooMany;
  const dims = [
    input.flags.hasImage,
    input.flags.hasPrice,
    input.flags.hasFutureSessions,
    subOk,
  ];
  const ok = dims.filter(Boolean).length;
  return Math.round((ok / dims.length) * 100);
}

export function isImportedArchived(event: { source: EventSource; isActive: boolean }): boolean {
  return event.source !== EventSource.MANUAL && event.isActive === false;
}

/** Тот же OR, что `issuesPreset=api` в `GET /admin/events` — операционные проблемы витрины. */
export function adminEventsIssuesPresetApiWhere(now: Date): Prisma.EventWhereInput {
  const futureSessionsWhereActive: Prisma.EventSessionWhereInput = {
    startsAt: { gt: now },
    isActive: true,
    canceledAt: null,
  };
  return {
    OR: [
      { venueId: null },
      { subcategoryLinks: { none: {} } },
      { offers: { none: { isDeleted: false, status: OfferStatus.ACTIVE, priceFrom: { gt: 0 } } } },
      { sessions: { none: futureSessionsWhereActive } },
      { imageUrl: null, OR: [{ override: null }, { override: { imageUrl: null } }] },
    ],
  };
}

/**
 * Приближение «готово к публикации» для фильтра списка (Prisma; без JS-валидации виджета).
 * MANUAL: внешняя покупка не требуется; импорт: есть ACTIVE оффер WIDGET с widgetProvider или REDIRECT с непустым deeplink.
 */
export function adminEventsReadyToPublishAndParts(now: Date): Prisma.EventWhereInput[] {
  const futureSessionsWhereActive: Prisma.EventSessionWhereInput = {
    startsAt: { gt: now },
    isActive: true,
    canceledAt: null,
  };
  return [
    { isActive: true },
    { OR: [{ override: null }, { override: { isHidden: false } }] },
    { venueId: { not: null } },
    { subcategoryLinks: { some: {} } },
    { sessions: { some: futureSessionsWhereActive } },
    { offers: { some: { isDeleted: false, status: OfferStatus.ACTIVE, priceFrom: { gt: 0 } } } },
    {
      OR: [
        { imageUrl: { not: null } },
        { override: { imageUrl: { not: null } } },
      ],
    },
    {
      OR: [
        { source: EventSource.MANUAL },
        {
          source: { not: EventSource.MANUAL },
          offers: {
            some: {
              isDeleted: false,
              status: OfferStatus.ACTIVE,
              OR: [
                { purchaseType: PurchaseType.WIDGET, widgetProvider: { not: null } },
                { purchaseType: PurchaseType.REDIRECT, deeplink: { not: null } },
              ],
            },
          },
        },
      ],
    },
  ];
}

export type AdminEventListQuickPublishFlags = {
  needsAttention: boolean;
  readyToPublish: boolean;
};

/** Флаги для строки списка (согласованы с Lovable quick filters на бэке). */
export function computeAdminEventListQuickPublishFlags(input: {
  source: EventSource;
  isActive: boolean;
  overrideHidden: boolean;
  readinessListStatus: 'READY' | 'NEEDS_WORK' | 'BLOCKED';
  externalPurchaseStatus: 'READY' | 'MISSING' | 'INVALID' | 'DISABLED' | 'PROVIDER_UNSUPPORTED';
}): AdminEventListQuickPublishFlags {
  const imported = input.source !== EventSource.MANUAL;
  const purchaseReady = !imported || input.externalPurchaseStatus === 'READY';
  const listReady = input.readinessListStatus === 'READY';
  const readyToPublish = input.isActive && !input.overrideHidden && listReady && purchaseReady;
  const needsAttention = input.isActive && !input.overrideHidden && !readyToPublish;
  return { needsAttention, readyToPublish };
}
