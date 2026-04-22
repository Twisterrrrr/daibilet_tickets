import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { TicketProviderCode } from '@/prisma-client';

import { TICKET_PROVIDER_DISPLAY_LABEL } from '../provider-labels';
import type { ExternalTicketProvider } from '../contracts/external-ticket-provider.interface';
import type { ProviderDescriptor } from '../contracts/provider-descriptor';
import { ProviderNotRegisteredError } from '../contracts/provider-errors';
import { TICKET_EXTERNAL_PROVIDERS } from '../integrations.constants';

export interface AdminProviderSummaryDto {
  code: TicketProviderCode;
  displayName: string;
  protocolType: ProviderDescriptor['protocolType'];
  operationalClass: ProviderDescriptor['operationalClass'];
  authType: ProviderDescriptor['authType'];
  capabilities: ProviderDescriptor['capabilities'];
}

@Injectable()
export class ProviderRegistryService implements OnModuleInit {
  private readonly byCode = new Map<TicketProviderCode, ExternalTicketProvider>();

  constructor(
    @Inject(TICKET_EXTERNAL_PROVIDERS)
    private readonly adapters: ExternalTicketProvider[],
  ) {}

  onModuleInit(): void {
    this.byCode.clear();
    for (const adapter of this.adapters) {
      const { code } = adapter.getDescriptor();
      this.byCode.set(code, adapter);
    }
  }

  get(code: TicketProviderCode): ExternalTicketProvider {
    const adapter = this.byCode.get(code);
    if (!adapter) {
      throw new ProviderNotRegisteredError(code);
    }
    return adapter;
  }

  getDescriptor(code: TicketProviderCode): ProviderDescriptor {
    return this.get(code).getDescriptor();
  }

  listAdminSummaries(): AdminProviderSummaryDto[] {
    return [...this.byCode.keys()].sort().map((code) => {
      const d = this.getDescriptor(code);
      return {
        code,
        displayName: TICKET_PROVIDER_DISPLAY_LABEL[code],
        protocolType: d.protocolType,
        operationalClass: d.operationalClass,
        authType: d.authType,
        capabilities: d.capabilities,
      };
    });
  }
}
