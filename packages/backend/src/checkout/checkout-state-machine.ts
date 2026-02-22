/**
 * State Machine для Checkout и OrderRequest.
 *
 * Все допустимые переходы описаны декларативно.
 * Контроллеры, сервисы и cron ОБЯЗАНЫ использовать эти функции.
 *
 * Переходы разделены по TransitionActor:
 *   - user:   инициированные пользователем (фронтенд)
 *   - admin:  инициированные оператором/админом
 *   - system: инициированные cron/webhook/автоматикой
 *
 * assert*() возвращает TransitionResult { allowed, noOp, reason }.
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('StateMachine');

// ========================================
// Types
// ========================================

export type TransitionActor = 'user' | 'admin' | 'system';

export interface TransitionResult {
  /** Переход допустим И нужен (from !== to) */
  allowed: boolean;
  /** Идемпотентный no-op (from === to) */
  noOp: boolean;
  /** Причина отказа (если allowed === false и noOp === false) */
  reason?: string;
}

// ========================================
// CheckoutSession Status Machine
// ========================================

export enum CheckoutStatus {
  STARTED = 'STARTED',
  VALIDATED = 'VALIDATED',
  REDIRECTED = 'REDIRECTED',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

const CHECKOUT_TRANSITIONS: Record<CheckoutStatus, Partial<Record<TransitionActor, CheckoutStatus[]>>> = {
  [CheckoutStatus.STARTED]: {
    user: [CheckoutStatus.VALIDATED, CheckoutStatus.CANCELLED],
    system: [CheckoutStatus.EXPIRED],
  },
  [CheckoutStatus.VALIDATED]: {
    user: [CheckoutStatus.REDIRECTED, CheckoutStatus.PENDING_CONFIRMATION],
    system: [CheckoutStatus.EXPIRED],
    admin: [CheckoutStatus.CANCELLED],
  },
  [CheckoutStatus.REDIRECTED]: {
    system: [CheckoutStatus.COMPLETED, CheckoutStatus.EXPIRED],
    admin: [CheckoutStatus.COMPLETED, CheckoutStatus.CANCELLED],
  },
  [CheckoutStatus.PENDING_CONFIRMATION]: {
    admin: [CheckoutStatus.CONFIRMED, CheckoutStatus.CANCELLED],
    system: [CheckoutStatus.EXPIRED],
  },
  [CheckoutStatus.CONFIRMED]: {
    admin: [CheckoutStatus.AWAITING_PAYMENT, CheckoutStatus.COMPLETED, CheckoutStatus.CANCELLED],
    system: [CheckoutStatus.COMPLETED],
  },
  [CheckoutStatus.AWAITING_PAYMENT]: {
    system: [CheckoutStatus.COMPLETED, CheckoutStatus.EXPIRED],
    admin: [CheckoutStatus.COMPLETED, CheckoutStatus.CANCELLED],
  },
  [CheckoutStatus.COMPLETED]: {},
  [CheckoutStatus.EXPIRED]: {},
  [CheckoutStatus.CANCELLED]: {},
};

export const CHECKOUT_TERMINAL: ReadonlySet<CheckoutStatus> = new Set([
  CheckoutStatus.COMPLETED,
  CheckoutStatus.EXPIRED,
  CheckoutStatus.CANCELLED,
]);

export function canTransitionCheckout(from: string, to: string, actor?: TransitionActor): boolean {
  if (from === to) return true;
  const transitions = CHECKOUT_TRANSITIONS[from as CheckoutStatus];
  if (!transitions) return false;
  if (actor) return (transitions[actor] || []).includes(to as CheckoutStatus);
  return Object.values(transitions).some((arr) => arr?.includes(to as CheckoutStatus));
}

/**
 * Проверить переход CheckoutSession. Возвращает структурный результат.
 */
export function tryTransitionCheckout(from: string, to: string, actor?: TransitionActor): TransitionResult {
  if (from === to) {
    logger.debug(`Checkout idempotent no-op: ${from} → ${to}`);
    return { allowed: true, noOp: true };
  }
  if (canTransitionCheckout(from, to, actor)) {
    return { allowed: true, noOp: false };
  }
  const actorStr = actor ? ` (actor: ${actor})` : '';
  const reason = `Недопустимый переход CheckoutSession: ${from} → ${to}${actorStr}`;
  logger.warn(`DENIED transition: ${reason}`);
  return { allowed: false, noOp: false, reason };
}

/**
 * Assert-вариант. Бросает ошибку при запрещённом переходе.
 * @returns TransitionResult (всегда allowed=true или noOp=true)
 */
export function assertCheckoutTransition(from: string, to: string, actor?: TransitionActor): TransitionResult {
  const result = tryTransitionCheckout(from, to, actor);
  if (!result.allowed && !result.noOp) {
    throw new Error(result.reason);
  }
  return result;
}

// ========================================
// OrderRequest Status Machine
// ========================================

export enum OrderRequestStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

const ORDER_REQUEST_TRANSITIONS: Record<OrderRequestStatus, Partial<Record<TransitionActor, OrderRequestStatus[]>>> = {
  [OrderRequestStatus.PENDING]: {
    admin: [OrderRequestStatus.CONFIRMED, OrderRequestStatus.REJECTED],
    system: [OrderRequestStatus.EXPIRED],
  },
  [OrderRequestStatus.CONFIRMED]: {},
  [OrderRequestStatus.REJECTED]: {},
  [OrderRequestStatus.EXPIRED]: {},
};

export const ORDER_REQUEST_TERMINAL: ReadonlySet<OrderRequestStatus> = new Set([
  OrderRequestStatus.CONFIRMED,
  OrderRequestStatus.REJECTED,
  OrderRequestStatus.EXPIRED,
]);

export function canTransitionOrderRequest(from: string, to: string, actor?: TransitionActor): boolean {
  if (from === to) return true;
  const transitions = ORDER_REQUEST_TRANSITIONS[from as OrderRequestStatus];
  if (!transitions) return false;
  if (actor) return (transitions[actor] || []).includes(to as OrderRequestStatus);
  return Object.values(transitions).some((arr) => arr?.includes(to as OrderRequestStatus));
}

export function tryTransitionOrderRequest(from: string, to: string, actor?: TransitionActor): TransitionResult {
  if (from === to) {
    logger.debug(`OrderRequest idempotent no-op: ${from} → ${to}`);
    return { allowed: true, noOp: true };
  }
  if (canTransitionOrderRequest(from, to, actor)) {
    return { allowed: true, noOp: false };
  }
  const actorStr = actor ? ` (actor: ${actor})` : '';
  const reason = `Недопустимый переход OrderRequest: ${from} → ${to}${actorStr}`;
  logger.warn(`DENIED transition: ${reason}`);
  return { allowed: false, noOp: false, reason };
}

export function assertOrderRequestTransition(from: string, to: string, actor?: TransitionActor): TransitionResult {
  const result = tryTransitionOrderRequest(from, to, actor);
  if (!result.allowed && !result.noOp) {
    throw new Error(result.reason);
  }
  return result;
}

// ========================================
// PaymentIntent Status Machine
// ========================================

export enum PaymentIntentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

const PAYMENT_TRANSITIONS: Record<PaymentIntentStatus, Partial<Record<TransitionActor, PaymentIntentStatus[]>>> = {
  [PaymentIntentStatus.PENDING]: {
    user: [PaymentIntentStatus.CANCELLED],
    system: [PaymentIntentStatus.PROCESSING, PaymentIntentStatus.PAID, PaymentIntentStatus.FAILED],
  },
  [PaymentIntentStatus.PROCESSING]: {
    system: [PaymentIntentStatus.PAID, PaymentIntentStatus.FAILED],
    user: [PaymentIntentStatus.CANCELLED],
  },
  [PaymentIntentStatus.PAID]: {
    admin: [PaymentIntentStatus.REFUNDED],
    system: [PaymentIntentStatus.REFUNDED],
  },
  [PaymentIntentStatus.FAILED]: {}, // терминальный (можно создать новый intent)
  [PaymentIntentStatus.CANCELLED]: {},
  [PaymentIntentStatus.REFUNDED]: {},
};

export const PAYMENT_TERMINAL: ReadonlySet<PaymentIntentStatus> = new Set([
  PaymentIntentStatus.PAID,
  PaymentIntentStatus.FAILED,
  PaymentIntentStatus.CANCELLED,
  PaymentIntentStatus.REFUNDED,
]);

export function canTransitionPayment(from: string, to: string, actor?: TransitionActor): boolean {
  if (from === to) return true;
  const transitions = PAYMENT_TRANSITIONS[from as PaymentIntentStatus];
  if (!transitions) return false;
  if (actor) return (transitions[actor] || []).includes(to as PaymentIntentStatus);
  return Object.values(transitions).some((arr) => arr?.includes(to as PaymentIntentStatus));
}

export function tryTransitionPayment(from: string, to: string, actor?: TransitionActor): TransitionResult {
  if (from === to) {
    logger.debug(`PaymentIntent idempotent no-op: ${from} → ${to}`);
    return { allowed: true, noOp: true };
  }
  if (canTransitionPayment(from, to, actor)) {
    return { allowed: true, noOp: false };
  }
  const actorStr = actor ? ` (actor: ${actor})` : '';
  const reason = `Недопустимый переход PaymentIntent: ${from} → ${to}${actorStr}`;
  logger.warn(`DENIED transition: ${reason}`);
  return { allowed: false, noOp: false, reason };
}

export function assertPaymentTransition(from: string, to: string, actor?: TransitionActor): TransitionResult {
  const result = tryTransitionPayment(from, to, actor);
  if (!result.allowed && !result.noOp) {
    throw new Error(result.reason);
  }
  return result;
}

// ========================================
// Expire Reasons
// ========================================

export enum ExpireReason {
  SLA = 'SLA',
  TTL = 'TTL',
  CART = 'CART',
}

// ========================================
// SLA / TTL
// ========================================

export const DEFAULT_REQUEST_SLA_MINUTES = 30;
export const CHECKOUT_SESSION_TTL_MINUTES = 30;
export const QUICK_REQUEST_TTL_MINUTES = 24 * 60;

export function calculateExpiresAt(minutes: number, from?: Date): Date {
  const base = from || new Date();
  return new Date(base.getTime() + minutes * 60 * 1000);
}

export function isExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
}

export function determineExpireReason(request: {
  checkoutSessionId: string | null;
  slaMinutes: number;
  expiresAt: Date | null;
  createdAt: Date;
}): ExpireReason {
  if (request.checkoutSessionId) return ExpireReason.CART;
  const slaDeadline = new Date(new Date(request.createdAt).getTime() + request.slaMinutes * 60 * 1000);
  if (new Date() > slaDeadline) return ExpireReason.SLA;
  return ExpireReason.TTL;
}
