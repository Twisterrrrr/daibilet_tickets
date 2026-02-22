import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { CatalogModule } from '../catalog/catalog.module';
import { QUEUE_EMAILS, QUEUE_FULFILLMENT, QUEUE_REVIEW_TASKS, QUEUE_SYNC } from '../queue/queue.constants';
import { FulfillmentSchedulerService } from './fulfillment-scheduler.service';
import { OrderExpiryService } from './order-expiry.service';
import { RetentionService } from './retention.service';
import { ReviewSchedulerService } from './review-scheduler.service';
import { SchedulerService } from './scheduler.service';
import { TagAssignmentService } from './tag-assignment.service';

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
  providers: [
    SchedulerService,
    RetentionService,
    ReviewSchedulerService,
    OrderExpiryService,
    TagAssignmentService,
    FulfillmentSchedulerService,
  ],
  exports: [TagAssignmentService],
})
export class SchedulerModule {}
