export type PurchaseDisplayType =
  | 'INTERNAL_TICKET'
  | 'EXTERNAL_VOUCHER'
  | 'BOOKING_CONFIRMATION'
  | 'AWAITING_PAYMENT'
  | 'MANUAL_CONFIRMATION';

export interface PurchaseDisplayInput {
  sessionStatus: string;
  paymentStatus: string;
  isExternalFlow: boolean;
  hasExternalUrl: boolean;
  hasTrack: boolean;
}

export interface PurchaseDisplayResult {
  purchaseType: PurchaseDisplayType;
  displayStatus: string;
}

export function getPurchaseDisplayType(input: PurchaseDisplayInput): PurchaseDisplayResult {
  const { sessionStatus, paymentStatus, isExternalFlow, hasExternalUrl, hasTrack } = input;

  if (sessionStatus === 'PENDING_CONFIRMATION') {
    return { purchaseType: 'MANUAL_CONFIRMATION', displayStatus: 'Ожидает подтверждения' };
  }

  if (sessionStatus === 'AWAITING_PAYMENT' || paymentStatus === 'PENDING' || paymentStatus === 'PROCESSING') {
    return { purchaseType: 'AWAITING_PAYMENT', displayStatus: 'Ожидает оплаты' };
  }

  if (sessionStatus === 'COMPLETED' || sessionStatus === 'CONFIRMED') {
    if (isExternalFlow && (hasExternalUrl || hasTrack)) {
      return { purchaseType: 'EXTERNAL_VOUCHER', displayStatus: 'Подтверждено партнёром' };
    }

    if (isExternalFlow || (!hasTrack && !hasExternalUrl)) {
      return { purchaseType: 'BOOKING_CONFIRMATION', displayStatus: 'Бронирование подтверждено' };
    }

    if (paymentStatus === 'PAID' && hasTrack) {
      return { purchaseType: 'INTERNAL_TICKET', displayStatus: 'Билет доступен' };
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

