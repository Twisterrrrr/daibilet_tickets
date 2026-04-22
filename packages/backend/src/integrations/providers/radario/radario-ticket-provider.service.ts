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
export class RadarioTicketProviderService implements ExternalTicketProvider {
  getDescriptor(): ProviderDescriptor {
    return {
      code: TicketProviderCode.RADARIO,
      protocolType: ProviderProtocolType.REST_JSON,
      operationalClass: ProviderOperationalClass.CORE_REST,
      authType: ProviderAccountAuthType.BEARER,
      capabilities: {
        ...emptyCapabilities(),
        supportsMultiAccount: true,
      },
    };
  }
}
