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

@Injectable()
export class TeplohodTicketProviderService implements ExternalTicketProvider {
  getDescriptor(): ProviderDescriptor {
    return {
      code: TicketProviderCode.TEPLOHOD,
      protocolType: ProviderProtocolType.REST_JSON,
      operationalClass: ProviderOperationalClass.CORE_REST,
      authType: ProviderAccountAuthType.NONE,
      capabilities: {
        ...emptyCapabilities(),
        supportsHostedPaymentPage: true,
        supportsPullEvents: true,
        supportsPullSessions: true,
      },
    };
  }
}
