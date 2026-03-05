import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RedisCacheModule } from '../cache/cache.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { VoucherModule } from '../voucher/voucher.module';
import { ReviewService } from '../catalog/review.service';
import { QUEUE_EMAILS, QUEUE_SYNC } from '../queue/queue.constants';
import { TagAssignmentService } from '../scheduler/tag-assignment.service';
import { SupportModule } from '../support/support.module';

import { AdminArticlesController } from './admin-articles.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminCitiesController } from './admin-cities.controller';
import { AdminCollectionsController } from './admin-collections.controller';
import { AdminCombosController } from './admin-combos.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminEventsController } from './admin-events.controller';
import { AdminExternalReviewsController } from './admin-external-reviews.controller';
import { AdminLandingsController } from './admin-landings.controller';
import { AdminModerationController } from './admin-moderation.controller';
import { AdminOpsController } from './admin-ops.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminCacheController } from './admin-cache.controller';
import { AdminReconciliationController } from './admin-reconciliation.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSuppliersController } from './admin-suppliers.controller';
import { AdminSupportController } from './admin-support.controller';
import { AdminTagsController } from './admin-tags.controller';
import { AdminUpsellsController } from './admin-upsells.controller';
import { AdminVenuesController } from './admin-venues.controller';
import { AdminWidgetsController } from './admin-widgets.controller';
import { AdminUploadController } from './admin-upload.controller';
import { AdminCheckoutController } from './admin-checkout.controller';
import { AuditService } from './audit.service';
import { EventOverrideService } from './event-override.service';
import { PaymentMetricsService } from '../checkout/payment-metrics.service';

@Module({
  imports: [
    AuthModule,
    RedisCacheModule,
    SupportModule,
    CheckoutModule,
    CatalogModule,
    VoucherModule,
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
    AdminCacheController,
    AdminUploadController,
  ],
  exports: [AuditService, EventOverrideService, ReviewService],
})
export class AdminModule {}
