import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RedisCacheModule } from '../cache/cache.module';
import { CatalogModule } from '../catalog/catalog.module';
import { FuzzyDedupService } from '../catalog/fuzzy-dedup.service';
import { QUEUE_EMAILS, QUEUE_SYNC } from '../queue/queue.constants';

import { AdminDashboardController } from './admin-dashboard.controller';
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
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSuppliersController } from './admin-suppliers.controller';
import { AdminSupportController } from './admin-support.controller';
import { AdminWidgetsController } from './admin-widgets.controller';
import { AdminOpsController } from './admin-ops.controller';
import { AdminReconciliationController } from './admin-reconciliation.controller';
import { SupportModule } from '../support/support.module';
import { TagAssignmentService } from '../scheduler/tag-assignment.service';
import { CheckoutModule } from '../checkout/checkout.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RedisCacheModule,
    SupportModule,
    CheckoutModule,
    CatalogModule,
    BullModule.registerQueue(
      { name: QUEUE_EMAILS },
      { name: QUEUE_SYNC },
    ),
  ],
  providers: [AuditService, EventOverrideService, ReviewService, PaymentMetricsService, TagAssignmentService],
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
    AdminWidgetsController,
    AdminCollectionsController,
    AdminSupportController,
    AdminOpsController,
    AdminReconciliationController,
  ],
  exports: [AuditService, EventOverrideService, ReviewService],
})
export class AdminModule {}
