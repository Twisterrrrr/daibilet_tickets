import { EventSource, TicketProviderCode } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { ManualTicketProviderService } from '../providers/manual/manual-ticket-provider.service';
import { RadarioTicketProviderService } from '../providers/radario/radario-ticket-provider.service';
import { TicketscloudTicketProviderService } from '../providers/ticketscloud/ticketscloud-ticket-provider.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { ProviderRegistryService } from '../routing/provider-registry.service';
import { ProviderRoutingService } from '../routing/provider-routing.service';

function miniRegistry(): ProviderRegistryService {
  const r = new ProviderRegistryService([new ManualTicketProviderService(), new TicketscloudTicketProviderService()]);
  r.onModuleInit();
  return r;
}

describe('ProviderRoutingService', () => {
  it('uses EVENT_PROVIDER_LINK when active primary link exists', async () => {
    const prisma = {
      event: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'e1',
          source: EventSource.MANUAL,
          defaultProvider: null,
          providerLinks: [{ provider: TicketProviderCode.TICKETS_CLOUD }],
        }),
      },
    } as unknown as PrismaService;
    const routing = new ProviderRoutingService(prisma, miniRegistry());
    const debug = await routing.resolveProviderDebug('e1');
    expect(debug.strategy).toBe('EVENT_PROVIDER_LINK');
    expect(debug.provider).toBe(TicketProviderCode.TICKETS_CLOUD);
  });

  it('uses DEFAULT_PROVIDER when no link', async () => {
    const prisma = {
      event: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'e1',
          source: EventSource.TC,
          defaultProvider: TicketProviderCode.RADARIO,
          providerLinks: [],
        }),
      },
    } as unknown as PrismaService;
    const full = new ProviderRegistryService([
      new ManualTicketProviderService(),
      new TicketscloudTicketProviderService(),
      new RadarioTicketProviderService(),
    ]);
    full.onModuleInit();
    const routing = new ProviderRoutingService(prisma, full);
    const debug = await routing.resolveProviderDebug('e1');
    expect(debug.strategy).toBe('DEFAULT_PROVIDER');
    expect(debug.provider).toBe(TicketProviderCode.RADARIO);
  });

  it('falls back to legacy Event.source TC → TICKETS_CLOUD', async () => {
    const prisma = {
      event: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'e1',
          source: EventSource.TC,
          defaultProvider: null,
          providerLinks: [],
        }),
      },
    } as unknown as PrismaService;
    const routing = new ProviderRoutingService(prisma, miniRegistry());
    const debug = await routing.resolveProviderDebug('e1');
    expect(debug.strategy).toBe('LEGACY_FALLBACK');
    expect(debug.provider).toBe(TicketProviderCode.TICKETS_CLOUD);
  });
});
