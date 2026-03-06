/**
 * Единый контракт ошибок API для checkout/widget pipeline.
 * Backend возвращает { code, message, details?, retryable? }; фронт интерпретирует по code.
 */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  fieldErrors?: Record<string, string>;
  retryable?: boolean;
}

/** Коды ошибок checkout/widget (константы для типобезопасности). */
export const CheckoutErrorCode = {
  EVENT_ID_REQUIRED: 'EVENT_ID_REQUIRED',
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  EVENT_NOT_AVAILABLE: 'EVENT_NOT_AVAILABLE',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_UNAVAILABLE: 'SESSION_UNAVAILABLE',
  NOT_ENOUGH_AVAILABLE: 'NOT_ENOUGH_AVAILABLE',
  NO_OFFER: 'NO_OFFER',
  INVALID_QTY: 'INVALID_QTY',
  HOLD_EXPIRED: 'HOLD_EXPIRED',
  CHECKOUT_EXPIRED: 'CHECKOUT_EXPIRED',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
  PAYMENT_MISMATCH: 'PAYMENT_MISMATCH',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  CUSTOMER_VALIDATION_ERROR: 'CUSTOMER_VALIDATION_ERROR',
} as const;

export type CheckoutErrorCodeType = (typeof CheckoutErrorCode)[keyof typeof CheckoutErrorCode];
