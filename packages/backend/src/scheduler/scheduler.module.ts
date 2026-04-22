import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { CatalogModule } from '../catalog/catalog.module';
import {
  QUEUE_ANALYTICS_PREAGG,
  QUEUE_EMAILS,
  QUEUE_FULFILLMENT,
  QUEUE_REVIEW_TASKS,
  QUEUE_SYNC,
} from '../queue/queue.constants';
import { AnalyticsPreaggSchedulerService } from './analytics-preagg-scheduler.service';
import { SupplierModule } from '../supplier/supplier.module';
import { FulfillmentSchedulerService } from './fulfillment-scheduler.service';
import { OrderExpiryService } from './order-expiry.service';
import { RetentionService } from './retention.service';
import { ReviewSchedulerService } from './review-scheduler.service';
import { SchedulerService } from './scheduler.service';
import { SessionStatsService } from './session-stats.service';
import { SupplierDailyStatSchedulerService } from './supplier-daily-stat-scheduler.service';
import { TagAssignmentService } from './tag-assignment.service';
import { CatalogConsistencySnapshotSchedulerService } from './catalog-consistency-snapshot.scheduler';
import { TicketscloudMirrorSchedulerService } from './ticketscloud-mirror-scheduler.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CatalogModule,
    SupplierModule,
    BullModule.registerQueue(
      { name: QUEUE_EMAILS },
      { name: QUEUE_REVIEW_TASKS },
      { name: QUEUE_SYNC },
      { name: QUEUE_FULFILLMENT },
      { name: QUEUE_ANALYTICS_PREAGG },
    ),
  ],
  providers: [
    AnalyticsPreaggSchedulerService,
    SchedulerService,
    RetentionService,
    ReviewSchedulerService,
    OrderExpiryService,
    TagAssignmentService,
    FulfillmentSchedulerService,
    SessionStatsService,
    SupplierDailyStatSchedulerService,
    CatalogConsistencySnapshotSchedulerService,
    TicketscloudMirrorSchedulerService,
  ],
  exports: [TagAssignmentService],
})
export class SchedulerModule {}
