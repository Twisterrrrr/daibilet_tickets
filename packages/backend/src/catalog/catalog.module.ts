import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { EventOverrideService } from '../admin/event-override.service';
import { LandingModule } from '../landing/landing.module';
import { ReviewCapabilityService } from '../review/review-capability.service';
import { EventQualityService } from './event-quality.service';
import { QUEUE_EMAILS } from '../queue/queue.constants';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CategoryMappingService } from './category-mapping.service';
import { FuzzyDedupService } from './fuzzy-dedup.service';
import { RegionService } from './region.service';
import { ReviewService } from './review.service';
import { TcApiService } from './tc-api.service';
import { TcGrpcService } from './tc-grpc.service';
import { TcSyncService } from './tc-sync.service';
import { TepApiService } from './tep-api.service';
import { PostEditQueueService } from './postedit-queue.service';
import { RefundPolicyResolutionService } from './refund-policy-resolution.service';
import { ListingHealthService } from './listing-health.service';
import { TepSyncService } from './tep-sync.service';
import { EventTagLifecycleService } from './event-tag-lifecycle.service';
import { CollectionSelectionService } from './collection-selection.service';
import { PublishGateService } from './publish-gate.service';
import { LocationNormalizerService } from './location-normalizer.service';
import { VenueNormalizerService } from './venue-normalizer.service';
import { OfferNormalizerService } from './offer-normalizer.service';
import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';
import { CatalogClassificationNormalizerService } from './catalog-classification-normalizer.service';
import { CatalogConsistencyService } from './catalog-consistency.service';
import { CatalogGuardService } from './catalog-guard.service';
import { CatalogAuditService } from './catalog-audit.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_EMAILS }), LandingModule],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    RegionService,
    ReviewService,
    ReviewCapabilityService,
    TcApiService,
    TcGrpcService,
    TcSyncService,
    TepApiService,
    TepSyncService,
    CategoryMappingService,
    FuzzyDedupService,
    EventOverrideService,
    PostEditQueueService,
    EventQualityService,
    RefundPolicyResolutionService,
    ListingHealthService,
    EventTagLifecycleService,
    CollectionSelectionService,
    PublishGateService,
    LocationNormalizerService,
    VenueNormalizerService,
    OfferNormalizerService,
    SubcategoryPolicyService,
    CatalogClassificationNormalizerService,
    CatalogConsistencyService,
    CatalogGuardService,
    CatalogAuditService,
  ],
  exports: [
    CatalogService,
    RegionService,
    ReviewService,
    ReviewCapabilityService,
    TcApiService,
    TcGrpcService,
    TcSyncService,
    TepApiService,
    TepSyncService,
    FuzzyDedupService,
    EventOverrideService,
    PostEditQueueService,
    EventQualityService,
    RefundPolicyResolutionService,
    ListingHealthService,
    EventTagLifecycleService,
    CollectionSelectionService,
    PublishGateService,
    LocationNormalizerService,
    VenueNormalizerService,
    OfferNormalizerService,
    SubcategoryPolicyService,
    CatalogClassificationNormalizerService,
    CatalogConsistencyService,
    CatalogGuardService,
    CatalogAuditService,
  ],
})
export class CatalogModule {}
