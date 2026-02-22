/**
 * RefundEngineService — расчёт суммы возврата по политике отмен.
 * C4: Refund Engine v1 (tiers, breakdown).
 */
import { Injectable } from '@nestjs/common';

export interface RefundCalcInput {
  policySnapshot: {
    mode?: string;
    tiers?: Array<{ hoursBeforeStart: number; refundPercent: number }>;
    refundFees?: {
      platformFeeRefundable?: boolean;
      paymentFeeRefundable?: boolean;
      providerFeeRefundable?: boolean;
    };
  };
  sessionStartsAt: Date;
  grossCents: number;
  platformFeeCents?: number;
  paymentFeeCents?: number;
  providerPayableCents?: number;
}

export interface RefundCalcResult {
  refundPercent: number;
  refundableCents: number;
  breakdown: {
    grossRefundCents: number;
    platformFeeRefundCents: number;
    paymentFeeRefundCents: number;
    providerRefundCents: number;
  };
  calcSnapshot: Record<string, unknown>;
}

@Injectable()
export class RefundEngineService {

  /**
   * Calculate refund amount based on policy tiers and session start time.
   */
  calculate(input: RefundCalcInput): RefundCalcResult {
    const {
      policySnapshot,
      sessionStartsAt,
      grossCents,
      platformFeeCents = 0,
      paymentFeeCents = 0,
      providerPayableCents = 0,
    } = input;

    const mode = policySnapshot?.mode ?? 'TIERED';
    const tiers = (policySnapshot?.tiers ?? []) as Array<{
      hoursBeforeStart: number;
      refundPercent: number;
    }>;
    const fees = policySnapshot?.refundFees ?? {};

    if (mode === 'NO_REFUND') {
      return {
        refundPercent: 0,
        refundableCents: 0,
        breakdown: {
          grossRefundCents: 0,
          platformFeeRefundCents: 0,
          paymentFeeRefundCents: 0,
          providerRefundCents: 0,
        },
        calcSnapshot: { mode, refundPercent: 0, reason: 'NO_REFUND' },
      };
    }

    if (mode === 'MANUAL_ONLY') {
      return {
        refundPercent: 0,
        refundableCents: 0,
        breakdown: {
          grossRefundCents: 0,
          platformFeeRefundCents: 0,
          paymentFeeRefundCents: 0,
          providerRefundCents: 0,
        },
        calcSnapshot: { mode, refundPercent: 0, reason: 'MANUAL_ONLY' },
      };
    }

    const now = new Date();
    const hoursUntilStart = (sessionStartsAt.getTime() - now.getTime()) / (60 * 60 * 1000);

    let refundPercent = 0;
    const sortedTiers = [...tiers].sort((a, b) => b.hoursBeforeStart - a.hoursBeforeStart);
    for (const tier of sortedTiers) {
      if (hoursUntilStart >= tier.hoursBeforeStart) {
        refundPercent = tier.refundPercent;
        break;
      }
    }

    const grossRefundCents = Math.round((grossCents * refundPercent) / 100);
    const platformFeeRefundCents =
      fees.platformFeeRefundable !== false
        ? Math.round((platformFeeCents * refundPercent) / 100)
        : 0;
    const paymentFeeRefundCents =
      fees.paymentFeeRefundable !== false
        ? Math.round((paymentFeeCents * refundPercent) / 100)
        : 0;
    const providerRefundCents =
      fees.providerFeeRefundable !== false
        ? Math.round((providerPayableCents * refundPercent) / 100)
        : 0;

    const refundableCents =
      grossRefundCents + platformFeeRefundCents + paymentFeeRefundCents + providerRefundCents;

    return {
      refundPercent,
      refundableCents,
      breakdown: {
        grossRefundCents,
        platformFeeRefundCents,
        paymentFeeRefundCents,
        providerRefundCents,
      },
      calcSnapshot: {
        mode,
        hoursUntilStart,
        refundPercent,
        grossCents,
        grossRefundCents,
        platformFeeRefundCents,
        paymentFeeRefundCents,
        providerRefundCents,
        refundableCents,
      },
    };
  }
}
