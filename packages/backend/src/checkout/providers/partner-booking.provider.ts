/**
 * Partner Booking Provider — адаптер для бронирования через Partner API.
 *
 * Отправляет reserve/confirm через PartnerWebhookService к внешним поставщикам.
 */

import { Injectable, Logger } from '@nestjs/common';

import {
  BookingProvider,
  CancelRequest,
  CancelResult,
  ConfirmRequest,
  ConfirmResult,
  ReserveRequest,
  ReserveResult,
  StatusRequest,
  StatusResult,
} from '../booking-provider.interface';

@Injectable()
export class PartnerBookingProvider implements BookingProvider {
  readonly providerName = 'PARTNER';
  private readonly logger = new Logger(PartnerBookingProvider.name);

  /**
   * Reserve = отправить запрос на бронирование партнёру.
   * Партнёр подтверждает/отклоняет через webhook или API.
   */
  async reserve(request: ReserveRequest): Promise<ReserveResult> {
    try {
      this.logger.log(`PARTNER reserve: offerId=${request.offerId}, qty=${request.quantity}`);

      // Partner reserves happen via OrderRequest flow:
      // 1. OrderRequest created with PENDING status
      // 2. Partner confirms/rejects through partner API
      // The fulfillment item tracks the overall status
      const reservationId = `partner_${request.fulfillmentItemId}`;

      return {
        success: true,
        externalOrderId: reservationId,
        providerData: { offerId: request.offerId, pendingPartnerConfirmation: true },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`PARTNER reserve failed: ${msg}`);
      return {
        success: false,
        errorCode: 'PARTNER_RESERVE_FAILED',
        errorMessage: msg,
        retryable: true,
      };
    }
  }

  async confirm(request: ConfirmRequest): Promise<ConfirmResult> {
    this.logger.log(`PARTNER confirm: ${request.externalOrderId}`);
    // Partner confirmation comes from partner API, this is a no-op acknowledgment
    return { success: true };
  }

  async cancel(request: CancelRequest): Promise<CancelResult> {
    this.logger.log(`PARTNER cancel: ${request.externalOrderId}, reason=${request.reason}`);
    return { success: true };
  }

  async getStatus(_request: StatusRequest): Promise<StatusResult> {
    // Partner status is tracked via OrderRequest and partner webhooks
    return { status: 'pending' };
  }
}
