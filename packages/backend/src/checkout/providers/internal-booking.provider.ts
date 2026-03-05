/**
 * Internal Booking Provider — наш собственный провайдер бронирования.
 *
 * Сейчас: PLATFORM позиции = REQUEST → подтверждение оператором → оплата.
 * Потом: станет основным провайдером когда TC/TEP уйдут.
 *
 * Бронирование = создание/подтверждение OrderRequest.
 */

import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
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
export class InternalBookingProvider implements BookingProvider {
  readonly providerName = 'INTERNAL';
  private readonly logger = new Logger(InternalBookingProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reserve = проверить наличие + создать internal reservation.
   * Для REQUEST-офферов резерв фактически уже произошёл через OrderRequest.
   */
  async reserve(request: ReserveRequest): Promise<ReserveResult> {
    try {
      this.logger.log(`INTERNAL reserve: offerId=${request.offerId}, qty=${request.quantity}`);

      // Проверяем существование оффера
      const offer = await this.prisma.eventOffer.findUnique({
        where: { id: request.offerId },
        select: { id: true, status: true, availabilityMode: true },
      });

      if (!offer || offer.status !== 'ACTIVE') {
        return {
          success: false,
          errorCode: 'OFFER_UNAVAILABLE',
          errorMessage: 'Оффер неактивен или не найден',
          retryable: false,
        };
      }

      if (offer.availabilityMode === 'SOLD_OUT') {
        return {
          success: false,
          errorCode: 'SOLD_OUT',
          errorMessage: 'Распродано',
          retryable: false,
        };
      }

      // Для INTERNAL резерв — это наш внутренний ID
      const internalReservationId = `int_${request.fulfillmentItemId}`;

      return {
        success: true,
        externalOrderId: internalReservationId,
        providerData: { offerId: request.offerId, quantity: request.quantity },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`INTERNAL reserve failed: ${msg}`);
      return {
        success: false,
        errorCode: 'INTERNAL_ERROR',
        errorMessage: msg,
        retryable: true,
      };
    }
  }

  /**
   * Confirm = финализировать бронирование.
   * Для OrderRequest это уже произошло через админ-подтверждение.
   */
  async confirm(request: ConfirmRequest): Promise<ConfirmResult> {
    try {
      this.logger.log(`INTERNAL confirm: ${request.externalOrderId}`);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, errorCode: 'INTERNAL_CONFIRM_ERROR', errorMessage: msg };
    }
  }

  async cancel(request: CancelRequest): Promise<CancelResult> {
    try {
      this.logger.log(`INTERNAL cancel: ${request.externalOrderId}, reason=${request.reason}`);
      return { success: true };
    } catch (error) {
      return { success: false, errorMessage: (error as Error).message };
    }
  }

  async getStatus(_request: StatusRequest): Promise<StatusResult> {
    // Internal orders are tracked via FulfillmentItem directly
    return { status: 'confirmed' };
  }
}
