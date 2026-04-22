import { EventSource, TicketProviderCode } from '@/prisma-client';

import { ProviderRouteNotFoundError } from '../contracts/provider-errors';

export function ticketProviderFromLegacyEventSource(source: EventSource): TicketProviderCode {
  switch (source) {
    case EventSource.MANUAL:
      return TicketProviderCode.MANUAL;
    case EventSource.TC:
      return TicketProviderCode.TICKETS_CLOUD;
    case EventSource.TEPLOHOD:
      return TicketProviderCode.TEPLOHOD;
    default:
      throw new ProviderRouteNotFoundError('unknown', `Unexpected EventSource ${String(source)}`);
  }
}
