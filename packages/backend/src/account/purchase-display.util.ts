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

