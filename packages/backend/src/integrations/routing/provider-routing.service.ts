import { Injectable, NotFoundException } from '@nestjs/common';
import { ProviderLinkStatus, type TicketProviderCode } from '@prisma/client';

import type { ProviderDescriptor } from '../contracts/provider-descriptor';
import type { ProviderRoutingStrategy } from '../contracts/provider-types';
import type { ExternalTicketProvider } from '../contracts/external-ticket-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ticketProviderFromLegacyEventSource } from './legacy-event-source.map';
import { ProviderRegistryService } from './provider-registry.service';

export interface ResolvedTicketProvider {
  descriptor: ProviderDescriptor;
  provider: ExternalTicketProvider;
}

export interface ProviderRoutingDebugDto {
  strategy: ProviderRoutingStrategy;
  provider: TicketProviderCode;
  reason: string;
}

@Injectable()
export class ProviderRoutingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistryService,
  ) {}

  async resolveProviderDebug(eventId: string): Promise<ProviderRoutingDebugDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        source: true,
        defaultProvider: true,
        providerLinks: {
          where: { status: ProviderLinkStatus.ACTIVE, isPrimary: true },
          orderBy: { priority: 'desc' },
          take: 1,
          select: { provider: true },
        },
      },
    });
    if (!event) {
      throw new NotFoundException({ message: 'Event not found', eventId });
    }
    const primary = event.providerLinks[0];
    if (primary) {
      return {
        strategy: 'EVENT_PROVIDER_LINK',
        provider: primary.provider,
        reason: 'Active isPrimary EventProviderLink',
      };
    }
    if (event.defaultProvider) {
      return {
        strategy: 'DEFAULT_PROVIDER',
        provider: event.defaultProvider,
        reason: 'Event.defaultProvider',
      };
    }
    return {
      strategy: 'LEGACY_FALLBACK',
      provider: ticketProviderFromLegacyEventSource(event.source),
      reason: `Event.source=${event.source}`,
    };
  }

  async resolveForEvent(eventId: string): Promise<ResolvedTicketProvider> {
    const { provider: code } = await this.resolveProviderDebug(eventId);
    const adapter = this.registry.get(code);
    return { descriptor: adapter.getDescriptor(), provider: adapter };
  }
}
