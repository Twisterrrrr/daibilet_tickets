import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { SupplierModule } from '../supplier/supplier.module';
import { ApiKeyGuard } from './partner-auth.guard';
import { PartnerController } from './partner.controller';
import { PartnerWebhookProcessor } from './partner-webhook.processor';
import { PartnerWebhookService } from './partner-webhook.service';

@Module({
  imports: [PrismaModule, SupplierModule],
  controllers: [PartnerController],
  providers: [ApiKeyGuard, PartnerWebhookService, PartnerWebhookProcessor],
  exports: [PartnerWebhookService],
})
export class PartnerModule {}
