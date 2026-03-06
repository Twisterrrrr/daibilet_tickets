/**
 * Cart Partitioning — разделение корзины на PLATFORM и EXTERNAL потоки.
 *
 * Единственный контракт покупки: PurchaseFlow.
 * Домен НЕ знает о конкретных провайдерах (TC/TEP/etc).
 * Когда TC/TEP уходят — просто перестаём создавать EXTERNAL-офферы.
 */

// ============================================================
// PurchaseFlow — двухконтурная модель
// ============================================================

export enum PaymentFlowType {
  /** Оплата через нашу платформу (YooKassa) */
  PLATFORM = 'PLATFORM',
  /** Оплата у внешнего провайдера (TC widget, redirect, etc.) */
  EXTERNAL = 'EXTERNAL',
}

/**
 * Определить PurchaseFlow из purchaseType оффера.
 * Это единственное место в коде, где маппится purchaseType → PurchaseFlow.
 */
export function resolvePaymentFlow(purchaseType: string): PaymentFlowType {
  switch (purchaseType) {
    case 'WIDGET':
    case 'TC_WIDGET':
    case 'REDIRECT':
      return PaymentFlowType.EXTERNAL;
    case 'REQUEST':
    default:
      return PaymentFlowType.PLATFORM;
  }
}

// ============================================================
// Snapshot types (единая структура для PLATFORM и EXTERNAL)
// ============================================================

export interface SnapshotLineItem {
  lineItemIndex: number;
  offerId: string;
  eventId: string;
  sessionId?: string | null; // EventSession.id для учёта paid по сессии (widget/read API)
  externalEventId?: string; // tcEventId (TC: "6980...", TEPLOHOD: "tep-282") для reserve
  source: string;
  purchaseType: string;
  purchaseFlow: PaymentFlowType;
  // Content
  eventTitle: string;
  eventSlug: string;
  eventImage: string | null;
  badge: string | null;
  operatorName: string | null;
  // Pricing (kopecks)
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  priceCurrency: string;
  // Supplier/Split (для PLATFORM, null для EXTERNAL)
  supplierId: string | null;
  commissionRateSnapshot: number | null;
  platformFeeSnapshot: number | null;
  supplierAmountSnapshot: number | null;
  // External purchase
  deeplink: string | null;
  widgetProvider: string | null;
  widgetPayload: unknown;
  // Operational info
  meetingPoint: string | null;
  meetingInstructions: string | null;
  operationalPhone: string | null;
  operationalNote: string | null;
  // Meta
  snapshotAt: string;
}

// ============================================================
// Cart partitioning
// ============================================================

export interface PartitionedCart {
  /** Позиции, оплачиваемые через нашу платформу (YooKassa) */
  platform: SnapshotLineItem[];
  /** Позиции, оплачиваемые у внешнего провайдера (TC/TEP) */
  external: SnapshotLineItem[];
  /** Итого по PLATFORM-позициям (kopecks) */
  platformTotal: number;
  /** Итого по EXTERNAL-позициям (kopecks) */
  externalTotal: number;
  /** Общий итог (kopecks) */
  grandTotal: number;
}

/**
 * Разделить offersSnapshot на PLATFORM и EXTERNAL группы.
 * Единая структура snapshot — две реализации исполнения.
 */
export function partitionCart(snapshot: SnapshotLineItem[]): PartitionedCart {
  const platform = snapshot.filter((s) => s.purchaseFlow === PaymentFlowType.PLATFORM);
  const external = snapshot.filter((s) => s.purchaseFlow === PaymentFlowType.EXTERNAL);

  return {
    platform,
    external,
    platformTotal: platform.reduce((sum, s) => sum + s.lineTotal, 0),
    externalTotal: external.reduce((sum, s) => sum + s.lineTotal, 0),
    grandTotal: snapshot.reduce((sum, s) => sum + s.lineTotal, 0),
  };
}

// ============================================================
// Completion rule
// ============================================================

/** Терминальные статусы FulfillmentItem */
const FULFILLMENT_TERMINAL = new Set(['CONFIRMED', 'FAILED', 'CANCELLED', 'REFUNDED']);

/**
 * Проверить, все ли позиции завершены (для определения COMPLETED).
 *
 * Инвариант: CheckoutSession.COMPLETED только когда все line items
 * либо CONFIRMED, либо компенсированы (REFUNDED/CANCELLED).
 */
export function isSessionFullyFulfilled(fulfillmentStatuses: string[]): {
  fulfilled: boolean;
  allConfirmed: boolean;
  hasFailures: boolean;
} {
  if (fulfillmentStatuses.length === 0) return { fulfilled: false, allConfirmed: false, hasFailures: false };

  const allTerminal = fulfillmentStatuses.every((s) => FULFILLMENT_TERMINAL.has(s));
  const allConfirmed = fulfillmentStatuses.every((s) => s === 'CONFIRMED');
  const hasFailures = fulfillmentStatuses.some((s) => s === 'FAILED');

  return {
    fulfilled: allTerminal,
    allConfirmed,
    hasFailures,
  };
}
