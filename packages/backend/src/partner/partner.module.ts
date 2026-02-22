import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ApiKeyGuard } from './partner-auth.guard';
import { PartnerEventsController } from './partner-events.controller';
import { PartnerOrdersController } from './partner-orders.controller';
import { PartnerReportsController } from './partner-reports.controller';
import { PartnerWebhookProcessor } from './partner-webhook.processor';
import { PartnerWebhookService } from './partner-webhook.service';

@Module({
  imports: [PrismaModule],
  controllers: [PartnerEventsController, PartnerOrdersController, PartnerReportsController],
  providers: [ApiKeyGuard, PartnerWebhookService, PartnerWebhookProcessor],
  exports: [PartnerWebhookService],
})
export class PartnerModule {}
