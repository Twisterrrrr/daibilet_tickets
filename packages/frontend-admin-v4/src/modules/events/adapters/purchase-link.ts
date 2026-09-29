/**
 * Additive read-model для `purchaseLink` в GET /api/v1/admin/events/:id.
 * Контракт — `AdminPurchaseLinkDto` в docs/qa.md. Не логировать и не рендерить widgetPayload / секреты.
 */

import type { AdminPurchaseLinkDto, AdminPurchaseLinkBlockingReason } from '@/modules/events/types';

const STATUS_SET = new Set<string>(['READY', 'MISSING', 'INVALID', 'PROVIDER_UNSUPPORTED', 'DISABLED']);
const TYPE_SET = new Set<string>(['WIDGET', 'REDIRECT', 'EXTERNAL_PROVIDER', 'NONE']);
const PROVIDER_SET = new Set<string>(['TICKETSCLOUD', 'TEPLOHOD', 'INTERNAL', 'UNKNOWN']);
const REASON_SET = new Set<string>([
  'MISSING_PURCHASE_LINK',
  'MISSING_PROVIDER',
  'MISSING_DEEPLINK',
  'MISSING_WIDGET_PAYLOAD',
  'INVALID_DEEPLINK',
  'UNSUPPORTED_PURCHASE_TYPE',
]);

export type PurchaseLinkView = {
  purchaseType: AdminPurchaseLinkDto['purchaseType'] | 'UNKNOWN';
  provider: AdminPurchaseLinkDto['provider'] | 'UNKNOWN';
  status: AdminPurchaseLinkDto['status'] | 'UNKNOWN';
  blockingReasons: AdminPurchaseLinkBlockingReason[];
  /** Коды от API вне известного enum — только для подсказки оператору */
  blockingReasonsExtraRaw: string[];
  /** Сырые значения только для подписи «неизвестно» — не для API */
  raw?: { status?: string; purchaseType?: string; provider?: string };
  deeplinkPresent: boolean;
  /** Только http(s) — иначе не используем как кликабельную ссылку */
  deeplinkSafeHref: string | null;
  widgetPayloadPresent: boolean;
  isConfigured: boolean;
  isValid: boolean;
  lastCheckedAt: string | null | undefined;
};

const STATUS_LABEL_RU: Record<string, string> = {
  READY: 'Готово',
  MISSING: 'Не настроено',
  INVALID: 'Некорректно',
  PROVIDER_UNSUPPORTED: 'Провайдер не поддерживается',
  DISABLED: 'Отключено',
  UNKNOWN: 'Неизвестный статус',
};

const REASON_LABEL_RU: Record<string, string> = {
  MISSING_PURCHASE_LINK: 'Нет ссылки покупки',
  MISSING_PROVIDER: 'Не указан провайдер',
  MISSING_DEEPLINK: 'Нет deeplink',
  MISSING_WIDGET_PAYLOAD: 'Нет параметров виджета',
  INVALID_DEEPLINK: 'Некорректный deeplink',
  UNSUPPORTED_PURCHASE_TYPE: 'Тип покупки не поддерживается',
};

const TYPE_LABEL_RU: Record<string, string> = {
  WIDGET: 'Виджет',
  REDIRECT: 'Редирект',
  EXTERNAL_PROVIDER: 'Внешний провайдер',
  NONE: 'Нет',
  UNKNOWN: 'Неизвестно',
};

const PROVIDER_LABEL_RU: Record<string, string> = {
  TICKETSCLOUD: 'Ticketscloud',
  TEPLOHOD: 'Teplohod.info',
  INTERNAL: 'Внутренний',
  UNKNOWN: 'Неизвестно',
};

export function labelPurchaseStatus(status: string): string {
  return STATUS_LABEL_RU[status] ?? `Неизвестно (${status})`;
}

export function labelBlockingReason(code: string): string {
  return REASON_LABEL_RU[code] ?? code;
}

export function labelPurchaseType(t: string): string {
  return TYPE_LABEL_RU[t] ?? `Неизвестно (${t})`;
}

export function labelProvider(p: string): string {
  return PROVIDER_LABEL_RU[p] ?? `Неизвестно (${p})`;
}

function normString(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function normBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  return fallback;
}

/** Безопасно извлекает признак наличия widgetPayload без утечки содержимого. */
function widgetPayloadPresentOnly(raw: unknown): boolean {
  if (raw == null) return false;
  if (typeof raw !== 'object' || Array.isArray(raw)) return false;
  return Object.keys(raw as object).length > 0;
}

function safeHttpHref(raw: unknown): string | null {
  const s = normString(raw);
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
  } catch {
    return null;
  }
  return null;
}

/**
 * Парсит произвольный JSON в нормализованный view. Возвращает null, если объекта покупки нет / это не объект.
 */
export function parsePurchaseLinkPayload(raw: unknown): PurchaseLinkView | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const o = raw as Record<string, unknown>;

  const st = normString(o.status);
  const pt = normString(o.purchaseType);
  const pv = normString(o.provider);

  const hasAnySignal =
    Boolean(st || pt || pv) ||
    o.deeplink != null ||
    o.widgetPayload != null ||
    (Array.isArray(o.blockingReasons) && o.blockingReasons.length > 0) ||
    typeof o.isConfigured === 'boolean' ||
    typeof o.isValid === 'boolean' ||
    o.lastCheckedAt != null;

  if (!hasAnySignal) return null;

  const status = st && STATUS_SET.has(st) ? (st as PurchaseLinkView['status']) : st ? 'UNKNOWN' : 'UNKNOWN';
  const purchaseType =
    pt && TYPE_SET.has(pt) ? (pt as PurchaseLinkView['purchaseType']) : pt ? 'UNKNOWN' : 'UNKNOWN';
  const provider =
    pv && PROVIDER_SET.has(pv) ? (pv as PurchaseLinkView['provider']) : pv ? 'UNKNOWN' : 'UNKNOWN';

  const brRaw = Array.isArray(o.blockingReasons) ? o.blockingReasons : [];
  const blockingReasons: AdminPurchaseLinkBlockingReason[] = [];
  const blockingReasonsExtraRaw: string[] = [];
  for (const x of brRaw) {
    const s = normString(x);
    if (!s) continue;
    if (REASON_SET.has(s)) blockingReasons.push(s as AdminPurchaseLinkBlockingReason);
    else blockingReasonsExtraRaw.push(s);
  }

  const deeplinkStr = normString(o.deeplink);
  const deeplinkPresent = Boolean(deeplinkStr);
  const deeplinkSafeHref = safeHttpHref(o.deeplink);
  const widgetPayloadPresent = widgetPayloadPresentOnly(o.widgetPayload);

  const isConfigured = normBool(o.isConfigured, deeplinkPresent || widgetPayloadPresent);
  const isValid = normBool(o.isValid, status === 'READY');

  const lastCheckedAt = normString(o.lastCheckedAt) ?? undefined;

  return {
    purchaseType,
    provider,
    status,
    blockingReasons,
    blockingReasonsExtraRaw,
    raw:
      status === 'UNKNOWN' || purchaseType === 'UNKNOWN' || provider === 'UNKNOWN'
        ? { status: st, purchaseType: pt, provider: pv }
        : undefined,
    deeplinkPresent,
    deeplinkSafeHref,
    widgetPayloadPresent,
    isConfigured,
    isValid,
    lastCheckedAt,
  };
}

/** Readiness: истина только при READY от бэкенда (additive контракт). */
export function purchaseLinkReadinessDone(view: PurchaseLinkView): boolean {
  return view.status === 'READY';
}

export function purchaseLinkReadinessHint(view: PurchaseLinkView): string | undefined {
  if (
    view.status === 'READY' &&
    view.blockingReasons.length === 0 &&
    view.blockingReasonsExtraRaw.length === 0
  ) {
    return undefined;
  }

  const parts: string[] = [];
  parts.push(`Статус: ${labelPurchaseStatus(view.status)}`);

  if (view.blockingReasons.length) {
    parts.push(`Ограничения: ${view.blockingReasons.map((c) => labelBlockingReason(c)).join(', ')}`);
  }
  if (view.blockingReasonsExtraRaw.length) {
    parts.push(`Доп. коды: ${view.blockingReasonsExtraRaw.join(', ')}`);
  }

  if (view.status === 'UNKNOWN' && view.raw?.status) {
    parts.push(`Сырой статус API: ${view.raw.status}`);
  }

  return parts.join(' · ');
}
