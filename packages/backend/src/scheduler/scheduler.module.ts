import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service';
import { ReviewSchedulerService } from './review-scheduler.service';
import { CatalogModule } from '../catalog/catalog.module';
import { ComboModule } from '../combo/combo.module';
import { QUEUE_EMAILS, QUEUE_REVIEW_TASKS } from '../queue/queue.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CatalogModule,
    ComboModule,
    BullModule.registerQueue(
      { name: QUEUE_EMAILS },
      { name: QUEUE_REVIEW_TASKS },
    ),
  ],
  providers: [SchedulerService, ReviewSchedulerService],
})
export class SchedulerModule {}
