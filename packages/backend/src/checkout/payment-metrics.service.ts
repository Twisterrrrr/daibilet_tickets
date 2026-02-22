/**
 * Payment Metrics Service — in-memory counters for payment observability.
 *
 * Exposes counters via /admin/ops/metrics endpoint.
 * Also logs structured JSON events for each payment lifecycle event.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface PaymentMetrics {
  payment_intent_created: number;
  payment_intent_paid: number;
  payment_intent_failed: number;
  payment_intent_cancelled: number;
  payment_intent_refunded: number;
  fulfillment_started: number;
  fulfillment_reserve_success: number;
  fulfillment_reserve_fail: number;
  fulfillment_confirm_success: number;
  fulfillment_confirm_fail: number;
  refund_success: number;
  refund_fail: number;
  webhook_received: number;
  webhook_duplicate: number;
  webhook_processed: number;
  auto_compensate_triggered: number;
}

@Injectable()
export class PaymentMetricsService {
  private readonly logger = new Logger(PaymentMetricsService.name);
  private counters: PaymentMetrics = this.initCounters();
  private readonly startedAt = new Date();

  private initCounters(): PaymentMetrics {
    return {
      payment_intent_created: 0,
      payment_intent_paid: 0,
      payment_intent_failed: 0,
      payment_intent_cancelled: 0,
      payment_intent_refunded: 0,
      fulfillment_started: 0,
      fulfillment_reserve_success: 0,
      fulfillment_reserve_fail: 0,
      fulfillment_confirm_success: 0,
      fulfillment_confirm_fail: 0,
      refund_success: 0,
      refund_fail: 0,
      webhook_received: 0,
      webhook_duplicate: 0,
      webhook_processed: 0,
      auto_compensate_triggered: 0,
    };
  }

  /**
   * Increment a counter and log structured event.
   */
  increment(metric: keyof PaymentMetrics, context?: Record<string, unknown>): void {
    this.counters[metric]++;

    // Structured log (JSON-friendly)
    this.logger.log(
      JSON.stringify({
        event: 'payment_metric',
        metric,
        value: this.counters[metric],
        ...context,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  /**
   * Get all counters snapshot.
   */
  getMetrics(): PaymentMetrics & { uptime_seconds: number; started_at: string } {
    return {
      ...this.counters,
      uptime_seconds: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
      started_at: this.startedAt.toISOString(),
    };
  }

  /**
   * Reset counters (for testing).
   */
  reset(): void {
    this.counters = this.initCounters();
  }
}
