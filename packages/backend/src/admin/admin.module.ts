import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RedisCacheModule } from '../cache/cache.module';

import { AuditService } from './audit.service';
import { EventOverrideService } from './event-override.service';
import { PaymentMetricsService } from '../checkout/payment-metrics.service';
import { ReviewService } from '../catalog/review.service';
import { FuzzyDedupService } from '../catalog/fuzzy-dedup.service';
import { QUEUE_EMAILS, QUEUE_SYNC } from '../queue/queue.constants';

import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminCitiesController } from './admin-cities.controller';
import { AdminEventsController } from './admin-events.controller';
import { AdminTagsController } from './admin-tags.controller';
import { AdminLandingsController } from './admin-landings.controller';
import { AdminCombosController } from './admin-combos.controller';
import { AdminArticlesController } from './admin-articles.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminUpsellsController } from './admin-upsells.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminExternalReviewsController } from './admin-external-reviews.controller';
import { AdminCheckoutController } from './admin-checkout.controller';
import { AdminSuppliersController } from './admin-suppliers.controller';
import { AdminModerationController } from './admin-moderation.controller';
import { AdminVenuesController } from './admin-venues.controller';
import { AdminCollectionsController } from './admin-collections.controller';
import { AdminSupportController } from './admin-support.controller';
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
    AdminCollectionsController,
    AdminSupportController,
    AdminOpsController,
    AdminReconciliationController,
  ],
  exports: [AuditService, EventOverrideService, ReviewService],
})
export class AdminModule {}
