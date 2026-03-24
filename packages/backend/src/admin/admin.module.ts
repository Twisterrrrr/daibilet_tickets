import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RedisCacheModule } from '../cache/cache.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CheckoutModule } from '../checkout/checkout.module';
import { VoucherModule } from '../voucher/voucher.module';
import { ReviewService } from '../catalog/review.service';
import { QUEUE_ANALYTICS_PREAGG, QUEUE_EMAILS, QUEUE_SYNC } from '../queue/queue.constants';
import { TagAssignmentService } from '../scheduler/tag-assignment.service';
import { LandingModule } from '../landing/landing.module';
import { CollectionModule } from '../collection/collection.module';
import { SupportModule } from '../support/support.module';
import { PreviewModule } from '../preview/preview.module';
import { PromoModule } from '../promo/promo.module';
import { ReportsModule } from '../reports/reports.module';
import { SupplierModule } from '../supplier/supplier.module';
import { EdoModule } from '../edo/edo.module';

import { AdminArticlesController } from './admin-articles.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminCitiesController } from './admin-cities.controller';
import { AdminCollectionsController } from './admin-collections.controller';
import { AdminCombosController } from './admin-combos.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AnalyticsPreaggProcessor } from './analytics-preagg.processor';
import { AnalyticsService } from './analytics.service';
import { AdminDiagnosticsService } from './admin-diagnostics.service';
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
import { AdminSeoAuditController } from './admin-seo-audit.controller';
import { AdminPreviewsController } from './admin-previews.controller';
import { AdminPromoBlocksController } from './admin-promo-blocks.controller';
import { AdminPromoBlocksService } from './admin-promo-blocks.service';
import { AdminPromoCollectionsController } from './admin-promo-collections.controller';
import { AdminPromoCollectionsService } from './admin-promo-collections.service';
import { AdminPromoCodesController } from './admin-promo-codes.controller';
import { AdminSourceCategoriesController } from './admin-source-categories.controller';
import { AdminReportsController } from './admin-reports.controller';
import { AdminPayoutsController } from './admin-payouts.controller';
import { AdminFinanceController } from './admin-finance.controller';
import { AdminFinanceSettlementsController } from './admin-finance-settlements.controller';
import { AdminFinanceDocumentsDemoController } from './admin-finance-documents-demo.controller';
import { AdminSupplierDisputesController } from './admin-supplier-disputes.controller';
import { AdminListingHealthController } from './admin-listing-health.controller';
import { AdminCatalogConsistencyController } from './admin-catalog-consistency.controller';
import { AdminAvailabilityController } from './admin-availability.controller';
import { AdminSupplierEdoController } from './admin-supplier-edo.controller';
import { AdminEdoDeliveryController } from './admin-edo-delivery.controller';
import { AdminSubcategoriesController } from './admin-subcategories.controller';
import { AdminTicketPdfDebugController } from './admin-ticket-pdf-debug.controller';
import { AuditService } from './audit.service';
import { EventAdminSummaryService } from './event-admin-summary.service';
import { VenueAdminSummaryService } from './venue-admin-summary.service';
import { EventOverrideService } from './event-override.service';
import { EventTagRulesService } from './event-tag-rules.service';
import { PaymentMetricsService } from '../checkout/payment-metrics.service';
import { OperationLatencyTrackerService } from '../common/operation-latency-tracker.service';
import { SeoAuditService } from './seo-audit/seo-audit.service';

@Module({
  imports: [
    AuthModule,
    CollectionModule,
    LandingModule,
    RedisCacheModule,
    SupportModule,
    CheckoutModule,
    CatalogModule,
    VoucherModule,
    PreviewModule,
    PromoModule,
    ReportsModule,
    SupplierModule,
    EdoModule,
    BullModule.registerQueue(
      { name: QUEUE_EMAILS },
      { name: QUEUE_SYNC },
      { name: QUEUE_ANALYTICS_PREAGG },
    ),
  ],
  providers: [
    OperationLatencyTrackerService,
    AnalyticsService,
    AnalyticsPreaggProcessor,
    AdminDashboardService,
    AdminDiagnosticsService,
    AuditService,
    EventOverrideService,
    EventTagRulesService,
    EventAdminSummaryService,
    VenueAdminSummaryService,
    ReviewService,
    PaymentMetricsService,
    TagAssignmentService,
    SeoAuditService,
    AdminPromoBlocksService,
    AdminPromoCollectionsService,
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
    AdminWidgetsController,
    AdminCollectionsController,
    AdminSupportController,
    AdminOpsController,
    AdminReconciliationController,
    AdminCacheController,
    AdminUploadController,
    AdminSeoAuditController,
    AdminPreviewsController,
    AdminPromoBlocksController,
    AdminPromoCollectionsController,
    AdminPromoCodesController,
    AdminSourceCategoriesController,
    AdminReportsController,
    AdminPayoutsController,
    AdminFinanceController,
    AdminFinanceSettlementsController,
    AdminFinanceDocumentsDemoController,
    AdminSupplierDisputesController,
    AdminAvailabilityController,
    AdminListingHealthController,
    AdminCatalogConsistencyController,
    AdminSupplierEdoController,
    AdminEdoDeliveryController,
    AdminSubcategoriesController,
    AdminTicketPdfDebugController,
  ],
  exports: [AuditService, EventOverrideService, ReviewService],
})
export class AdminModule {}
