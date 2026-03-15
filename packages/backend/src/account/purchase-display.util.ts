export type PurchaseDisplayType =
  | 'INTERNAL_TICKET'
  | 'EXTERNAL_VOUCHER'
  | 'BOOKING_CONFIRMATION'
  | 'AWAITING_PAYMENT'
  | 'MANUAL_CONFIRMATION';

/**
 * Статус заказа у провайдера.
 * Ticketscloud: getOrder().status → executed → confirmed, cancelled/returned → cancelled.
 * Teplohod: сейчас бронирование идёт через тот же TC-адаптер (TcBookingProvider), статус тот же.
 * Если у Teplohod появится свой API заказов — нужен отдельный провайдер с getStatus() и маппинг их статусов сюда.
 */
export type ProviderOrderStatus = 'confirmed' | 'cancelled' | 'returned' | 'pending' | 'unknown';

const PROVIDER_STATUS_MESSAGE: Record<ProviderOrderStatus, string> = {
  confirmed: 'Билет отправлен на e-mail',
  cancelled: 'Билет отменен, ожидайте возврата',
  returned: 'Билет отменен, ожидайте возврата',
  pending: 'Обрабатывается',
  unknown: 'Неизвестно',
};

/** Вывести displayStatus по статусу провайдера (TC/Teplohod). */
export function getDisplayStatusByProviderStatus(providerStatus: ProviderOrderStatus): string {
  return PROVIDER_STATUS_MESSAGE[providerStatus];
}

/** По нашей сессии и платежу вывести статус провайдера (когда реальный getStatus ещё не подставлен). */
export function deriveProviderStatus(sessionStatus: string, paymentStatus: string): ProviderOrderStatus {
  if (paymentStatus === 'REFUNDED' || sessionStatus === 'CANCELLED' || sessionStatus === 'EXPIRED') {
    return 'cancelled';
  }
  if ((sessionStatus === 'COMPLETED' || sessionStatus === 'CONFIRMED') && paymentStatus === 'PAID') {
    return 'confirmed';
  }
  if (
    sessionStatus === 'AWAITING_PAYMENT' ||
    sessionStatus === 'PENDING_CONFIRMATION' ||
    paymentStatus === 'PENDING' ||
    paymentStatus === 'PROCESSING'
  ) {
    return 'pending';
  }
  return 'unknown';
}

export interface PurchaseDisplayInput {
  sessionStatus: string;
  paymentStatus: string;
  isExternalFlow: boolean;
  hasExternalUrl: boolean;
  hasTrack: boolean;
  /** Покупка через Ticketscloud или Teplohod (FulfillmentItem.provider TC/TEP) — те же статусы, что и для EXTERNAL. */
  isProviderTcOrTep?: boolean;
  /** Когда есть — используем для EXTERNAL_VOUCHER/внешней брони (Ticketscloud getStatus, позже Teplohod). */
  providerStatus?: ProviderOrderStatus;
}

export interface PurchaseDisplayResult {
  purchaseType: PurchaseDisplayType;
  displayStatus: string;
}

export function getPurchaseDisplayType(input: PurchaseDisplayInput): PurchaseDisplayResult {
  const { sessionStatus, paymentStatus, isExternalFlow, hasExternalUrl, hasTrack, isProviderTcOrTep, providerStatus } =
    input;
  const useProviderStatusMessages = isExternalFlow || isProviderTcOrTep;

  if (sessionStatus === 'PENDING_CONFIRMATION') {
    return { purchaseType: 'MANUAL_CONFIRMATION', displayStatus: 'Ожидает подтверждения' };
  }

  if (sessionStatus === 'AWAITING_PAYMENT' || paymentStatus === 'PENDING' || paymentStatus === 'PROCESSING') {
    return { purchaseType: 'AWAITING_PAYMENT', displayStatus: 'Ожидает оплаты' };
  }

  if (sessionStatus === 'COMPLETED' || sessionStatus === 'CONFIRMED') {
    if (useProviderStatusMessages && (hasExternalUrl || hasTrack)) {
      const status = providerStatus ?? deriveProviderStatus(sessionStatus, paymentStatus);
      return {
        purchaseType: 'EXTERNAL_VOUCHER',
        displayStatus: getDisplayStatusByProviderStatus(status === 'returned' ? 'cancelled' : status),
      };
    }

    if (useProviderStatusMessages && !(hasExternalUrl || hasTrack)) {
      const status = providerStatus ?? deriveProviderStatus(sessionStatus, paymentStatus);
      return {
        purchaseType: 'BOOKING_CONFIRMATION',
        displayStatus: getDisplayStatusByProviderStatus(status === 'returned' ? 'cancelled' : status),
      };
    }

    if (paymentStatus === 'PAID' && hasTrack) {
      if (isProviderTcOrTep) {
        const status = providerStatus ?? deriveProviderStatus(sessionStatus, paymentStatus);
        return {
          purchaseType: 'EXTERNAL_VOUCHER',
          displayStatus: getDisplayStatusByProviderStatus(status === 'returned' ? 'cancelled' : status),
        };
      }
      return { purchaseType: 'INTERNAL_TICKET', displayStatus: 'Билет доступен' };
    }

    if (!hasTrack && !hasExternalUrl) {
      return { purchaseType: 'BOOKING_CONFIRMATION', displayStatus: 'Бронирование подтверждено' };
    }

    return { purchaseType: 'BOOKING_CONFIRMATION', displayStatus: 'Бронирование подтверждено' };
  }

  return { purchaseType: 'MANUAL_CONFIRMATION', displayStatus: 'В обработке' };
}

export interface PurchaseActionsInput {
  purchaseType: PurchaseDisplayType;
  lastIntentPaymentUrl: string | null;
  trackUrl: string | null;
  externalUrl: string | null;
}

export interface PurchaseActionsResult {
  primaryAction: { label: string; url: string } | null;
  secondaryAction: { label: string; url: string } | null;
}

export interface TicketAvailabilityInput {
  sessionStatus: string;
  hasTrack: boolean;
  hasExternalUrl: boolean;
  trackUrl: string | null;
  externalUrl: string | null;
}

export function computeTicketAvailable(input: TicketAvailabilityInput): boolean {
  const { sessionStatus, hasTrack, hasExternalUrl, trackUrl, externalUrl } = input;

  // Для MVP артефакт билета определяется как наличие того, что реально можно открыть:
  // - внутренний trackUrl при COMPLETED,
  // - внешний externalPaymentUrl при EXTERNAL‑fulfillment.
  if (sessionStatus === 'COMPLETED' && hasTrack && trackUrl) {
    return true;
  }
  if (hasExternalUrl && externalUrl) {
    return true;
  }
  return false;
}

export function derivePurchaseActions(input: PurchaseActionsInput): PurchaseActionsResult {
  const { purchaseType, lastIntentPaymentUrl, trackUrl, externalUrl } = input;

  let primaryAction: { label: string; url: string } | null = null;
  let secondaryAction: { label: string; url: string } | null = null;

  if (purchaseType === 'INTERNAL_TICKET' && trackUrl) {
    primaryAction = { label: 'Открыть билет', url: trackUrl };
  } else if (purchaseType === 'EXTERNAL_VOUCHER' && externalUrl) {
    primaryAction = { label: 'Посмотреть ваучер', url: externalUrl };
    if (trackUrl) secondaryAction = { label: 'Открыть трекинг', url: trackUrl };
  } else if (purchaseType === 'BOOKING_CONFIRMATION' && trackUrl) {
    primaryAction = { label: 'Открыть трекинг', url: trackUrl };
  } else if (purchaseType === 'AWAITING_PAYMENT' && lastIntentPaymentUrl) {
    primaryAction = { label: 'Оплатить', url: lastIntentPaymentUrl };
  }

  return { primaryAction, secondaryAction };
}

