import { Injectable } from '@nestjs/common';
import {
  ProviderAccountAuthType,
  ProviderOperationalClass,
  ProviderProtocolType,
  TicketProviderCode,
} from '@prisma/client';

import { emptyCapabilities } from '../../contracts/provider-capabilities';
import type { ExternalTicketProvider } from '../../contracts/external-ticket-provider.interface';
import type { ProviderDescriptor } from '../../contracts/provider-descriptor';

@Injectable()
export class LanitTicketProviderService implements ExternalTicketProvider {
  getDescriptor(): ProviderDescriptor {
    return {
      code: TicketProviderCode.LANIT,
      protocolType: ProviderProtocolType.CUSTOM,
      operationalClass: ProviderOperationalClass.CUSTOM_PARTNER,
      authType: ProviderAccountAuthType.CUSTOM,
      capabilities: {
        ...emptyCapabilities(),
        requiresManualApproval: true,
        supportsMultiAccount: true,
      },
    };
  }
}
