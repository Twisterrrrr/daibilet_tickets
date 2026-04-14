import { Injectable } from '@nestjs/common';
import type { TicketProviderCode } from '@/prisma-client';

import { assertCapability } from '../contracts/capability-guard';
import { ProviderMethodNotImplementedError } from '../contracts/provider-errors';
import { ProviderRegistryService } from '../routing/provider-registry.service';

/**
 * Оркестрация синхронизации: только через descriptor + assertCapability.
 */
@Injectable()
export class ProviderSyncService {
  constructor(private readonly registry: ProviderRegistryService) {}

  async pullEvents(code: TicketProviderCode): Promise<unknown> {
    const adapter = this.registry.get(code);
    const descriptor = adapter.getDescriptor();
    assertCapability(descriptor, 'supportsPullEvents');
    if (!adapter.pullEvents) {
      throw new ProviderMethodNotImplementedError(code, 'pullEvents');
    }
    return adapter.pullEvents();
  }

  async pullSessions(code: TicketProviderCode): Promise<unknown> {
    const adapter = this.registry.get(code);
    const descriptor = adapter.getDescriptor();
    assertCapability(descriptor, 'supportsPullSessions');
    if (!adapter.pullSessions) {
      throw new ProviderMethodNotImplementedError(code, 'pullSessions');
    }
    return adapter.pullSessions();
  }
}
