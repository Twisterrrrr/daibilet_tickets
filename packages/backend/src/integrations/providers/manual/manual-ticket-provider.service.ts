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
export class ManualTicketProviderService implements ExternalTicketProvider {
  getDescriptor(): ProviderDescriptor {
    return {
      code: TicketProviderCode.MANUAL,
      protocolType: ProviderProtocolType.CUSTOM,
      operationalClass: ProviderOperationalClass.CUSTOM_PARTNER,
      authType: ProviderAccountAuthType.NONE,
      capabilities: emptyCapabilities(),
    };
  }
}
