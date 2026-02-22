import { Global, Module } from '@nestjs/common';

import { RedisCacheModule } from '../cache/cache.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Global()
@Module({
  imports: [PrismaModule, RedisCacheModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
