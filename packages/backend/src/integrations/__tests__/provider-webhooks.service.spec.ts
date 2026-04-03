import { TicketProviderCode } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { ProviderExternalPersistenceService } from '../provider-external-persistence.service';
import { ProviderRegistryService } from '../routing/provider-registry.service';
import { ProviderSignatureService } from '../provider-signature.service';
import { RadarioTicketProviderService } from '../providers/radario/radario-ticket-provider.service';
import { ProviderWebhooksService } from '../webhooks/provider-webhooks.service';

describe('ProviderWebhooksService', () => {
  it('returns NO_OP when supportsWebhooks is false (204 path)', async () => {
    const persistence = {
      createWebhookLog: vi.fn().mockResolvedValue({ id: 'log-1' }),
      markWebhookNoOp: vi.fn().mockResolvedValue({}),
    } as unknown as ProviderExternalPersistenceService;
    const registry = new ProviderRegistryService([new RadarioTicketProviderService()]);
    registry.onModuleInit();
    const webhooks = new ProviderWebhooksService(
      registry,
      persistence,
      new ProviderSignatureService(),
    );
    const outcome = await webhooks.ingest(TicketProviderCode.RADARIO, { ping: 1 }, {});
    expect(outcome.kind).toBe('NO_OP');
    expect(persistence.markWebhookNoOp).toHaveBeenCalled();
  });
});
