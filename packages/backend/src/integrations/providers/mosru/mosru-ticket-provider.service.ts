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
export class MosruTicketProviderService implements ExternalTicketProvider {
  getDescriptor(): ProviderDescriptor {
    return {
      code: TicketProviderCode.MOSRU_RUSSPASS,
      protocolType: ProviderProtocolType.REST_JSON,
      operationalClass: ProviderOperationalClass.ENTERPRISE_GATED,
      authType: ProviderAccountAuthType.OAUTH2,
      capabilities: {
        ...emptyCapabilities(),
        requiresManualApproval: true,
        requiresClientCertificate: true,
        supportsMultiAccount: true,
      },
    };
  }
}
