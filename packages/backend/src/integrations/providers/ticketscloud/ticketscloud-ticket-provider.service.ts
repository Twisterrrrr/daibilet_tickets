import { Injectable } from '@nestjs/common';
import {
  ProviderAccountAuthType,
  ProviderOperationalClass,
  ProviderProtocolType,
  TicketProviderCode,
} from '@/prisma-client';

import { emptyCapabilities } from '../../contracts/provider-capabilities';
import type { ExternalTicketProvider } from '../../contracts/external-ticket-provider.interface';
import type { ProviderDescriptor } from '../../contracts/provider-descriptor';

/**
 * Дескриптор возможностей Ticketscloud для B2B слоя.
 * Live HTTP/order — по-прежнему в tc-api / checkout; здесь без реализации методов API.
 */
@Injectable()
export class TicketscloudTicketProviderService implements ExternalTicketProvider {
  getDescriptor(): ProviderDescriptor {
    return {
      code: TicketProviderCode.TICKETS_CLOUD,
      protocolType: ProviderProtocolType.REST_JSON,
      operationalClass: ProviderOperationalClass.CORE_REST,
      authType: ProviderAccountAuthType.API_KEY,
      capabilities: {
        ...emptyCapabilities(),
        supportsCreateOrder: true,
        supportsGetOrderStatus: true,
        supportsCancelOrder: true,
        supportsReserveBeforePayment: true,
        supportsQrOrBarcode: true,
        supportsPdfTickets: true,
        supportsEmbeddedCheckout: true,
        supportsAvailability: true,
      },
    };
  }
}
