import { Module, Global } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisCacheModule } from '../cache/cache.module';

@Global()
@Module({
  imports: [PrismaModule, RedisCacheModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
