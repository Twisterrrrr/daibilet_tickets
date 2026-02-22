import { Module } from '@nestjs/common';

import { PricingModule } from '../pricing/pricing.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AvailabilityService } from './availability.service';
import { OccurrencePolicyService } from './occurrence-policy.service';
import { PriceSnapshotService } from './price-snapshot.service';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [PrismaModule, PricingModule],
  providers: [ScheduleService, AvailabilityService, PriceSnapshotService, OccurrencePolicyService],
  exports: [ScheduleService, AvailabilityService, PriceSnapshotService, OccurrencePolicyService],
})
export class ScheduleModule {}
