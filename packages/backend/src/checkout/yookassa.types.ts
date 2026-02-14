/**
 * YooKassa API response types — жёсткие контракты для платёжного провайдера.
 *
 * https://yookassa.ru/developers/api
 */

// ============================================================
// Payment
// ============================================================

export interface YkAmount {
  value: string;   // "1500.00"
  currency: string; // "RUB"
}

export interface YkConfirmation {
  type: string;       // "redirect"
  confirmation_url?: string;
  return_url?: string;
}

export interface YkTransfer {
  account_id: string;
  amount: YkAmount;
  platform_fee_moment?: string;
  description?: string;
}

export interface YkPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: YkAmount;
  income_amount?: YkAmount;
  description?: string;
  receipt?: unknown;
  recipient?: { account_id: string; gateway_id: string };
  payment_method?: {
    type: string;
    id?: string;
    saved?: boolean;
    title?: string;
    card?: {
      first6?: string;
      last4?: string;
      expiry_month?: string;
      expiry_year?: string;
      card_type?: string;
      issuer_country?: string;
    };
  };
  captured_at?: string;
  created_at: string;
  expires_at?: string;
  confirmation?: YkConfirmation;
  test: boolean;
  refunded_amount?: YkAmount;
  paid: boolean;
  refundable: boolean;
  metadata?: Record<string, string>;
  cancellation_details?: {
    party: string;
    reason: string;
  };
  authorization_details?: {
    rrn?: string;
    auth_code?: string;
  };
  transfers?: YkTransfer[];
}

// ============================================================
// Refund
// ============================================================

export interface YkRefund {
  id: string;
  payment_id: string;
  status: 'succeeded' | 'canceled';
  amount: YkAmount;
  created_at: string;
  description?: string;
  receipt?: unknown;
}

// ============================================================
// Webhook
// ============================================================

export interface YkWebhookEvent {
  type: string;           // "notification"
  event: string;          // "payment.succeeded", "payment.canceled", "refund.succeeded"
  object: YkPayment | YkRefund;
}

// ============================================================
// Type Guards
// ============================================================

export function isYkPayment(value: unknown): value is YkPayment {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.status === 'string' && typeof obj.paid === 'boolean';
}

export function isYkRefund(value: unknown): value is YkRefund {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.payment_id === 'string' && typeof obj.status === 'string';
}

export function isYkWebhookEvent(value: unknown): value is YkWebhookEvent {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.event === 'string' && obj.object !== null && typeof obj.object === 'object';
}

/**
 * Извлечь payment ID из webhook object.
 * Для payment.* — object.id
 * Для refund.* — object.payment_id
 */
export function extractPaymentIdFromWebhook(webhookObj: unknown): string | null {
  if (!webhookObj || typeof webhookObj !== 'object') return null;
  const obj = webhookObj as Record<string, unknown>;
  return (typeof obj.id === 'string' ? obj.id : null)
    || (typeof obj.payment_id === 'string' ? obj.payment_id : null);
}
