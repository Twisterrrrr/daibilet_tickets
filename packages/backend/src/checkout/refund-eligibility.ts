import type { DateMode, FulfillmentStatus } from '@/prisma-client';

import type { PrismaService } from '../prisma/prisma.service';

/** Контекст для проверки возможности возврата по одной позиции (MVP). */
export interface RefundEligibilityInput {
  now: Date;
  itemStatus: FulfillmentStatus;
  isRedeemed: boolean;
  /** Режим события; null если событие не загружено. */
  eventDateMode: DateMode | null;
  /** Для OPEN_DATE: срок действия билета/события. */
  eventEndDate: Date | null;
  /** Для SCHEDULED: сеанс из snapshot; null если нет sessionId. */
  sessionStartsAt: Date | null;
  /** true, если сеанс отменён (canceledAt) — обход временных ограничений. */
  sessionCancelledBypass: boolean;
}

export interface RefundEligibilityResult {
  canRefund: boolean;
  reason: string;
}

/**
 * Правила MVP: оплаченный активный билет = CONFIRMED; REFUND_PENDING/REFUNDED запрещены;
 * при отменённом сеансе — разрешено независимо от времени.
 */
export function evaluateRefundEligibility(ctx: RefundEligibilityInput): RefundEligibilityResult {
  if (ctx.itemStatus === 'REFUNDED') {
    return { canRefund: false, reason: 'ALREADY_REFUNDED' };
  }
  if (ctx.itemStatus === 'REFUND_PENDING') {
    return { canRefund: false, reason: 'REFUND_IN_PROGRESS' };
  }
  if (ctx.itemStatus !== 'CONFIRMED') {
    return { canRefund: false, reason: 'NOT_PAID_OR_NOT_ACTIVE' };
  }

  if (ctx.sessionCancelledBypass) {
    return { canRefund: true, reason: 'SESSION_CANCELLED' };
  }

  if (ctx.eventDateMode === 'OPEN_DATE') {
    if (ctx.isRedeemed) {
      return { canRefund: false, reason: 'TICKET_REDEEMED' };
    }
    if (ctx.eventEndDate && ctx.now > ctx.eventEndDate) {
      return { canRefund: false, reason: 'EVENT_EXPIRED' };
    }
    return { canRefund: true, reason: 'OK' };
  }

  if (ctx.sessionStartsAt != null && ctx.now >= ctx.sessionStartsAt) {
    return { canRefund: false, reason: 'SESSION_ALREADY_STARTED' };
  }

  return { canRefund: true, reason: 'OK' };
}

/**
 * Разрешает возвраты при отменённом сеансе (массовые операции — отдельно).
 */
export async function allowRefundForSession(prisma: PrismaService, sessionId: string): Promise<boolean> {
  const row = await prisma.eventSession.findUnique({
    where: { id: sessionId },
    select: { canceledAt: true },
  });
  return row?.canceledAt != null;
}
