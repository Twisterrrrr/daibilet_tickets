import { ProviderOperationalClass, ProviderProtocolType, TicketProviderCode } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { EdinoepoleTicketProviderService } from '../providers/edinoepole/edinoepole-ticket-provider.service';
import { InticketsTicketProviderService } from '../providers/intickets/intickets-ticket-provider.service';
import { LanitTicketProviderService } from '../providers/lanit/lanit-ticket-provider.service';
import { ManualTicketProviderService } from '../providers/manual/manual-ticket-provider.service';
import { MosruTicketProviderService } from '../providers/mosru/mosru-ticket-provider.service';
import { QticketsTicketProviderService } from '../providers/qtickets/qtickets-ticket-provider.service';
import { RadarioTicketProviderService } from '../providers/radario/radario-ticket-provider.service';
import { TeplohodTicketProviderService } from '../providers/teplohod/teplohod-ticket-provider.service';
import { TicketscloudTicketProviderService } from '../providers/ticketscloud/ticketscloud-ticket-provider.service';
import { TicketnetTicketProviderService } from '../providers/ticketnet/ticketnet-ticket-provider.service';
import { YandexTicketProviderService } from '../providers/yandex/yandex-ticket-provider.service';
import { ProviderRegistryService } from '../routing/provider-registry.service';
import { TICKET_EXTERNAL_PROVIDERS } from '../integrations.constants';

function createRegistry(): ProviderRegistryService {
  const adapters = [
    new ManualTicketProviderService(),
    new TicketscloudTicketProviderService(),
    new TeplohodTicketProviderService(),
    new RadarioTicketProviderService(),
    new QticketsTicketProviderService(),
    new InticketsTicketProviderService(),
    new EdinoepoleTicketProviderService(),
    new TicketnetTicketProviderService(),
    new YandexTicketProviderService(),
    new MosruTicketProviderService(),
    new LanitTicketProviderService(),
  ];
  const r = new ProviderRegistryService(adapters);
  r.onModuleInit();
  return r;
}

describe('ProviderRegistryService', () => {
  it('registers all Prisma ticket provider codes', () => {
    const registry = createRegistry();
    const codes = Object.values(TicketProviderCode).filter((v) => typeof v === 'string');
    for (const c of codes) {
      expect(() => registry.get(c as TicketProviderCode)).not.toThrow();
    }
  });

  it('exposes REST core vs SOAP scaffold descriptors', () => {
    const registry = createRegistry();
    const radario = registry.getDescriptor(TicketProviderCode.RADARIO);
    expect(radario.protocolType).toBe(ProviderProtocolType.REST_JSON);
    expect(radario.operationalClass).toBe(ProviderOperationalClass.CORE_REST);

    const ticketnet = registry.getDescriptor(TicketProviderCode.TICKETNET);
    expect(ticketnet.protocolType).toBe(ProviderProtocolType.SOAP_XML);
    expect(ticketnet.capabilities.supportsSoapXml).toBe(true);
  });

  it('inject token shape', () => {
    expect(TICKET_EXTERNAL_PROVIDERS).toBe('TICKET_EXTERNAL_PROVIDERS');
  });
});
