import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service';
import { RetentionService } from './retention.service';
import { ReviewSchedulerService } from './review-scheduler.service';
import { OrderExpiryService } from './order-expiry.service';
import { TagAssignmentService } from './tag-assignment.service';
import { FulfillmentSchedulerService } from './fulfillment-scheduler.service';
import { CatalogModule } from '../catalog/catalog.module';
import { QUEUE_EMAILS, QUEUE_REVIEW_TASKS, QUEUE_SYNC, QUEUE_FULFILLMENT } from '../queue/queue.constants';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CatalogModule,
    BullModule.registerQueue(
      { name: QUEUE_EMAILS },
      { name: QUEUE_REVIEW_TASKS },
      { name: QUEUE_SYNC },
      { name: QUEUE_FULFILLMENT },
    ),
  ],
  providers: [SchedulerService, RetentionService, ReviewSchedulerService, OrderExpiryService, TagAssignmentService, FulfillmentSchedulerService],
  exports: [TagAssignmentService],
})
export class SchedulerModule {}
