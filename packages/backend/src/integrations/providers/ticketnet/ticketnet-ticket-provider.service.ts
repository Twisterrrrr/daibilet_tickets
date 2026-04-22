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
export class TicketnetTicketProviderService implements ExternalTicketProvider {
  getDescriptor(): ProviderDescriptor {
    return {
      code: TicketProviderCode.TICKETNET,
      protocolType: ProviderProtocolType.SOAP_XML,
      operationalClass: ProviderOperationalClass.LEGACY_SOAP,
      authType: ProviderAccountAuthType.CUSTOM,
      capabilities: {
        ...emptyCapabilities(),
        supportsSoapXml: true,
      },
    };
  }
}
