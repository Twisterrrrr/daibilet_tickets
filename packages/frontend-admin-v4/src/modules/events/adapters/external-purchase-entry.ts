/**
 * Additive: `externalPurchaseEntry` в GET /api/v1/admin/events/:id.
 * Не рендерить widgetPayload целиком (секреты); только признаки.
 */

import type { AdminExternalPurchaseEntryDto } from '@/modules/events/types';

import { labelProvider, labelPurchaseStatus } from '@/modules/events/adapters/purchase-link';

const ENTRY_TYPE_RU: Record<string, string> = {
  WIDGET: 'Виджет провайдера',
  DEEPLINK: 'Внешняя ссылка (deeplink)',
  NONE: 'Нет',
};

const REASON_EXT_RU: Record<string, string> = {
  NO_ACTIVE_OFFER: 'Нет активного оффера',
  PURCHASE_TYPE_NOT_WIDGET_OR_REDIRECT: 'Тип оффера не виджет и не редирект',
  MISSING_WIDGET_PAYLOAD: 'Нет параметров виджета',
  INVALID_WIDGET_PAYLOAD: 'Некорректные параметры виджета',
  MISSING_DEEPLINK: 'Нет deeplink',
  INVALID_DEEPLINK: 'Некорректный deeplink',
};

export function labelEntryType(t: string): string {
  return ENTRY_TYPE_RU[t] ?? t;
}

export function labelExternalBlockingReason(code: string): string {
  return REASON_EXT_RU[code] ?? code;
}

export function externalPurchaseReadinessDone(e: AdminExternalPurchaseEntryDto): boolean {
  return e.status === 'READY' && e.isValid;
}

export function safeDeeplinkHref(href: string | null | undefined): string | null {
  if (!href || !String(href).trim()) return null;
  try {
    const u = new URL(String(href).trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function widgetPayloadPresentOnly(payload: Record<string, unknown> | null | undefined): boolean {
  return Boolean(payload && typeof payload === 'object' && Object.keys(payload).length > 0);
}

export { labelProvider, labelPurchaseStatus };
