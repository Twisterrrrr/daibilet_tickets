import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import type { ExternalTicketProvider } from './contracts/external-ticket-provider.interface';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminIntegrationsReadController } from './admin-integrations-read.controller';
import { EventProviderLinkService } from './event-provider-link.service';
import { TICKET_EXTERNAL_PROVIDERS } from './integrations.constants';
import { ManualTicketProviderService } from './providers/manual/manual-ticket-provider.service';
import { EdinoepoleTicketProviderService } from './providers/edinoepole/edinoepole-ticket-provider.service';
import { InticketsTicketProviderService } from './providers/intickets/intickets-ticket-provider.service';
import { LanitTicketProviderService } from './providers/lanit/lanit-ticket-provider.service';
import { MosruTicketProviderService } from './providers/mosru/mosru-ticket-provider.service';
import { QticketsHttpService } from './providers/qtickets/qtickets-http.service';
import { QticketsIntegrationEnv } from './providers/qtickets/qtickets-integration.env';
import { QticketsTicketProviderService } from './providers/qtickets/qtickets-ticket-provider.service';
import { RadarioHttpService } from './providers/radario/radario-http.service';
import { RadarioIntegrationEnv } from './providers/radario/radario-integration.env';
import { RadarioTicketProviderService } from './providers/radario/radario-ticket-provider.service';
import { TeplohodTicketProviderService } from './providers/teplohod/teplohod-ticket-provider.service';
import { TicketscloudTicketProviderService } from './providers/ticketscloud/ticketscloud-ticket-provider.service';
import { TicketnetTicketProviderService } from './providers/ticketnet/ticketnet-ticket-provider.service';
import { YandexTicketProviderService } from './providers/yandex/yandex-ticket-provider.service';
import { ProviderExternalPersistenceService } from './provider-external-persistence.service';
import { ProviderInboundWebhookController } from './provider-inbound-webhook.controller';
import { ProviderSignatureService } from './provider-signature.service';
import { ProviderRegistryService } from './routing/provider-registry.service';
import { ProviderRoutingService } from './routing/provider-routing.service';
import { ProviderSyncService } from './sync/provider-sync.service';
import { ProviderWebhooksService } from './webhooks/provider-webhooks.service';

const ADAPTER_CLASSES = [
  ManualTicketProviderService,
  TicketscloudTicketProviderService,
  TeplohodTicketProviderService,
  RadarioTicketProviderService,
  QticketsTicketProviderService,
  InticketsTicketProviderService,
  EdinoepoleTicketProviderService,
  TicketnetTicketProviderService,
  YandexTicketProviderService,
  MosruTicketProviderService,
  LanitTicketProviderService,
];

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [ProviderInboundWebhookController, AdminIntegrationsReadController],
  providers: [
    RadarioIntegrationEnv,
    RadarioHttpService,
    QticketsIntegrationEnv,
    QticketsHttpService,
    ...ADAPTER_CLASSES,
    {
      provide: TICKET_EXTERNAL_PROVIDERS,
      useFactory: (...adapters: ExternalTicketProvider[]) => adapters,
      inject: ADAPTER_CLASSES,
    },
    ProviderRegistryService,
    ProviderRoutingService,
    ProviderExternalPersistenceService,
    EventProviderLinkService,
    ProviderSignatureService,
    ProviderSyncService,
    ProviderWebhooksService,
  ],
  exports: [
    ProviderRegistryService,
    ProviderRoutingService,
    EventProviderLinkService,
    ProviderExternalPersistenceService,
    ProviderSyncService,
    ProviderWebhooksService,
    RadarioIntegrationEnv,
    RadarioHttpService,
    QticketsIntegrationEnv,
    QticketsHttpService,
  ],
})
export class IntegrationsModule {}
