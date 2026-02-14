/**
 * TC Booking Provider — адаптер для бронирования через Ticketscloud.
 *
 * Делегирует вызовы TcApiService (существующий сервис).
 * Будет удалён при переходе на единый чекаут.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { TcApiService } from '../../catalog/tc-api.service';
import {
  BookingProvider,
  ReserveRequest,
  ReserveResult,
  ConfirmRequest,
  ConfirmResult,
  CancelRequest,
  CancelResult,
  StatusRequest,
  StatusResult,
} from '../booking-provider.interface';

@Injectable()
export class TcBookingProvider implements BookingProvider {
  readonly providerName = 'TC';
  private readonly logger = new Logger(TcBookingProvider.name);

  constructor(@Optional() private readonly tcApi: TcApiService) {}

  async reserve(request: ReserveRequest): Promise<ReserveResult> {
    try {
      if (!this.tcApi) {
        return { success: false, errorCode: 'TC_NOT_CONFIGURED', errorMessage: 'TcApiService not available', retryable: false };
      }

      this.logger.log(`TC reserve: offerId=${request.offerId}, qty=${request.quantity}`);

      // TC API: create order = reserve
      const tcOrder = await this.tcApi.createOrder({
        event: request.externalEventId || '',
        random: { [request.offerId]: request.quantity },
      });

      const orderData = tcOrder as Record<string, unknown>;
      return {
        success: true,
        externalOrderId: (orderData?.id || orderData?._id) as string,
        providerData: orderData,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`TC reserve failed: ${msg}`);
      return {
        success: false,
        errorCode: 'TC_RESERVE_FAILED',
        errorMessage: msg,
        retryable: true,
      };
    }
  }

  async confirm(request: ConfirmRequest): Promise<ConfirmResult> {
    try {
      this.logger.log(`TC confirm: externalOrderId=${request.externalOrderId}`);

      const result = await this.tcApi.confirmOrder(request.externalOrderId);

      return {
        success: true,
        providerData: result as Record<string, unknown>,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`TC confirm failed: ${msg}`);
      return {
        success: false,
        errorCode: 'TC_CONFIRM_FAILED',
        errorMessage: msg,
      };
    }
  }

  async cancel(request: CancelRequest): Promise<CancelResult> {
    try {
      this.logger.log(`TC cancel: externalOrderId=${request.externalOrderId}`);

      await this.tcApi.cancelOrder(request.externalOrderId);

      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`TC cancel failed: ${msg}`);
      return { success: false, errorMessage: msg };
    }
  }

  async getStatus(request: StatusRequest): Promise<StatusResult> {
    try {
      const order = await this.tcApi.getOrder(request.externalOrderId);
      const tcStatus = (order as Record<string, unknown>)?.status;

      const statusMap: Record<string, StatusResult['status']> = {
        executed: 'confirmed',
        cancelled: 'cancelled',
        returned: 'cancelled',
      };

      return {
        status: statusMap[tcStatus as string] || 'pending',
        providerData: order as Record<string, unknown>,
      };
    } catch (error) {
      this.logger.error(`TC getStatus failed: ${(error as Error).message}`);
      return { status: 'unknown' };
    }
  }
}
