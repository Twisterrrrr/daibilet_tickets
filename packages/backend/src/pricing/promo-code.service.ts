import { Injectable, Logger } from '@nestjs/common';
import { PromoType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface ValidatePromoContext {
  operatorId?: string;
  eventIdsInCart: string[];
  totalAmount: number; // сумма корзины в копейках (для PLATFORM-позиций)
  now?: Date;
}

export interface ValidatePromoResult {
  valid: boolean;
  discountAmount: number;
  reason?: string;
  promo?: {
    id: string;
    code: string;
    type: PromoType;
    value: number;
  };
}

@Injectable()
export class PromoCodeService {
  private readonly logger = new Logger(PromoCodeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validate(code: string, ctx: ValidatePromoContext): Promise<ValidatePromoResult> {
    const normalized = code?.trim();
    if (!normalized) {
      return { valid: false, discountAmount: 0, reason: 'EMPTY_CODE' };
    }
    if (!ctx.eventIdsInCart || ctx.eventIdsInCart.length === 0 || ctx.totalAmount <= 0) {
      return { valid: false, discountAmount: 0, reason: 'EMPTY_CART' };
    }

    const promo = await this.prisma.promoCode.findFirst({
      where: {
        code: { equals: normalized, mode: 'insensitive' },
        isActive: true,
      },
    });

    if (!promo) {
      return { valid: false, discountAmount: 0, reason: 'NOT_FOUND' };
    }

    const now = ctx.now ?? new Date();
    if (promo.validFrom && promo.validFrom > now) {
      return { valid: false, discountAmount: 0, reason: 'NOT_STARTED' };
    }
    if (promo.validTo && promo.validTo < now) {
      return { valid: false, discountAmount: 0, reason: 'EXPIRED' };
    }
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
      return { valid: false, discountAmount: 0, reason: 'USAGE_LIMIT_REACHED' };
    }

    // Scope validation: operatorId / eventId
    if (promo.operatorId && ctx.operatorId && promo.operatorId !== ctx.operatorId) {
      return { valid: false, discountAmount: 0, reason: 'OPERATOR_MISMATCH' };
    }
    if (promo.eventId) {
      const matchesEvent = ctx.eventIdsInCart.includes(promo.eventId);
      if (!matchesEvent) {
        return { valid: false, discountAmount: 0, reason: 'EVENT_SCOPE_MISMATCH' };
      }
    }

    // Discount calculation
    let discountAmount = 0;
    if (promo.type === PromoType.PERCENT) {
      if (promo.value <= 0 || promo.value > 100) {
        this.logger.warn(`Invalid percent promo value value=${promo.value} id=${promo.id}`);
        return { valid: false, discountAmount: 0, reason: 'INVALID_VALUE' };
      }
      discountAmount = Math.floor((ctx.totalAmount * promo.value) / 100);
    } else if (promo.type === PromoType.FIXED) {
      if (promo.value <= 0) {
        return { valid: false, discountAmount: 0, reason: 'INVALID_VALUE' };
      }
      discountAmount = Math.min(promo.value, ctx.totalAmount);
    }

    if (discountAmount <= 0) {
      return { valid: false, discountAmount: 0, reason: 'ZERO_DISCOUNT' };
    }

    return {
      valid: true,
      discountAmount,
      promo: {
        id: promo.id,
        code: promo.code,
        type: promo.type,
        value: promo.value,
      },
    };
  }

  async markUsed(promoId: string): Promise<void> {
    await this.prisma.promoCode.update({
      where: { id: promoId },
      data: { usedCount: { increment: 1 } },
    });
  }
}

