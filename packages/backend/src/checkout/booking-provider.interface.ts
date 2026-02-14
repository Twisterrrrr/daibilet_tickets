/**
 * BookingProvider — единый интерфейс для бронирования у провайдеров.
 *
 * Домен НЕ знает "как именно бронируется TC/TEP/PARTNER".
 * Все провайдеры реализуют один интерфейс.
 *
 * Путь миграции к единому чекауту:
 *   1. Сейчас: TC/TEP/PARTNER адаптеры + InternalProvider (заглушка)
 *   2. Потом: InternalProvider становится основным, адаптеры удаляются
 */

// ============================================================
// Types
// ============================================================

export interface ReserveRequest {
  /** ID FulfillmentItem в нашей БД */
  fulfillmentItemId: string;
  /** ID оффера в нашей БД */
  offerId: string;
  /** External event ID (TC event ID, TEP slug, etc.) */
  externalEventId?: string;
  /** ID сеанса (если конкретный сеанс) */
  sessionId?: string;
  /** Кол-во билетов */
  quantity: number;
  /** Сумма в копейках */
  amount: number;
  /** Email покупателя */
  customerEmail?: string;
  /** Имя покупателя */
  customerName?: string;
  /** Idempotency key */
  idempotencyKey: string;
}

export interface ReserveResult {
  success: boolean;
  /** ID заказа у провайдера */
  externalOrderId?: string;
  /** Ссылка на оплату (для EXTERNAL) */
  externalPaymentUrl?: string;
  /** Доп. данные от провайдера */
  providerData?: Record<string, unknown>;
  /** Ошибка (если success=false) */
  errorCode?: string;
  errorMessage?: string;
  /** Можно ли повторить */
  retryable?: boolean;
}

export interface ConfirmRequest {
  fulfillmentItemId: string;
  externalOrderId: string;
  providerData?: Record<string, unknown>;
}

export interface ConfirmResult {
  success: boolean;
  providerData?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

export interface CancelRequest {
  fulfillmentItemId: string;
  externalOrderId: string;
  reason?: string;
}

export interface CancelResult {
  success: boolean;
  errorMessage?: string;
}

export interface StatusRequest {
  externalOrderId: string;
}

export interface StatusResult {
  status: 'pending' | 'reserved' | 'confirmed' | 'cancelled' | 'failed' | 'unknown';
  providerData?: Record<string, unknown>;
}

// ============================================================
// Provider interface
// ============================================================

/**
 * Абстракция провайдера бронирования.
 * Все провайдеры (TC, TEP, INTERNAL, PARTNER) реализуют этот интерфейс.
 */
export interface BookingProvider {
  /** Уникальное имя провайдера */
  readonly providerName: string;

  /** Зарезервировать позицию (soft-lock билета) */
  reserve(request: ReserveRequest): Promise<ReserveResult>;

  /** Подтвердить резерв (после оплаты) */
  confirm(request: ConfirmRequest): Promise<ConfirmResult>;

  /** Отменить резерв/заказ */
  cancel(request: CancelRequest): Promise<CancelResult>;

  /** Получить статус заказа у провайдера */
  getStatus(request: StatusRequest): Promise<StatusResult>;
}

// ============================================================
// Provider registry (DI-friendly)
// ============================================================

export const BOOKING_PROVIDER_TOKEN = 'BOOKING_PROVIDERS';

/**
 * Реестр провайдеров: providerName → BookingProvider.
 * Инжектится в FulfillmentService.
 */
export type BookingProviderRegistry = Map<string, BookingProvider>;
