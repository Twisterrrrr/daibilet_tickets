import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../prisma/prisma.module';
import { EdoProfileService } from './services/edo-profile.service';
import { EdoDeliveryService } from './services/edo-delivery.service';
import { EdoProviderRegistry } from './providers/edo-provider.registry';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [EdoProviderRegistry, EdoProfileService, EdoDeliveryService],
  exports: [EdoProfileService, EdoDeliveryService],
})
export class EdoModule {}
