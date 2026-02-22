import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RedisCacheModule } from '../cache/cache.module';
import { CatalogModule } from '../catalog/catalog.module';
import { FuzzyDedupService } from '../catalog/fuzzy-dedup.service';
import { ReviewService } from '../catalog/review.service';
import { CheckoutModule } from '../checkout/checkout.module';
import { PaymentMetricsService } from '../checkout/payment-metrics.service';
import { PrismaModule } from '../prisma/prisma.module';
import {
  QUEUE_EMAILS,
  QUEUE_FULFILLMENT,
  QUEUE_PARTNER_WEBHOOKS,
  QUEUE_REVIEW_TASKS,
  QUEUE_SYNC,
} from '../queue/queue.constants';
import { TagAssignmentService } from '../scheduler/tag-assignment.service';
import { ScheduleModule } from '../schedule/schedule.module';
import { SupportModule } from '../support/support.module';
import { AdminArticlesController } from './admin-articles.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminCheckoutController } from './admin-checkout.controller';
import { AdminCitiesController } from './admin-cities.controller';
import { AdminCollectionsController } from './admin-collections.controller';
import { AdminCombosController } from './admin-combos.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminEventsController } from './admin-events.controller';
import { AdminExternalReviewsController } from './admin-external-reviews.controller';
import { AdminJobsController } from './admin-jobs.controller';
import { AdminLandingsController } from './admin-landings.controller';
import { AdminModerationController } from './admin-moderation.controller';
import { AdminOpsController } from './admin-ops.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminReconciliationController } from './admin-reconciliation.controller';
import { AdminScheduleController } from './admin-schedule.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSuppliersController } from './admin-suppliers.controller';
import { AdminSupportController } from './admin-support.controller';
import { AdminTagsController } from './admin-tags.controller';
import { AdminUpsellsController } from './admin-upsells.controller';
import { AdminVenuesController } from './admin-venues.controller';
import { AuditService } from './audit.service';
import { EventOverrideService } from './event-override.service';
import { FailedJobsService } from './failed-jobs.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ScheduleModule,
    RedisCacheModule,
    SupportModule,
    CheckoutModule,
    CatalogModule,
    BullModule.registerQueue(
      { name: QUEUE_EMAILS },
      { name: QUEUE_SYNC },
      { name: QUEUE_FULFILLMENT },
      { name: QUEUE_REVIEW_TASKS },
      { name: QUEUE_PARTNER_WEBHOOKS },
    ),
  ],
  providers: [
    AuditService,
    EventOverrideService,
    ReviewService,
    PaymentMetricsService,
    TagAssignmentService,
    FailedJobsService,
  ],
  controllers: [
    AdminDashboardController,
    AdminCitiesController,
    AdminEventsController,
    AdminTagsController,
    AdminLandingsController,
    AdminCombosController,
    AdminArticlesController,
    AdminOrdersController,
    AdminSettingsController,
    AdminAuditController,
    AdminUpsellsController,
    AdminReviewsController,
    AdminExternalReviewsController,
    AdminCheckoutController,
    AdminSuppliersController,
    AdminModerationController,
    AdminVenuesController,
    AdminCollectionsController,
    AdminSupportController,
    AdminOpsController,
    AdminReconciliationController,
    AdminJobsController,
    AdminScheduleController,
  ],
  exports: [AuditService, EventOverrideService, ReviewService],
})
export class AdminModule {}
