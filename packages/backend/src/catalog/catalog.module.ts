import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { EventOverrideService } from '../admin/event-override.service';
import { EventQualityService } from './event-quality.service';
import { QUEUE_EMAILS } from '../queue/queue.constants';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { FuzzyDedupService } from './fuzzy-dedup.service';
import { RegionService } from './region.service';
import { ReviewService } from './review.service';
import { TcApiService } from './tc-api.service';
import { TcGrpcService } from './tc-grpc.service';
import { TcSyncService } from './tc-sync.service';
import { TepApiService } from './tep-api.service';
import { PostEditQueueService } from './postedit-queue.service';
import { TepSyncService } from './tep-sync.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_EMAILS })],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    RegionService,
    ReviewService,
    TcApiService,
    TcGrpcService,
    TcSyncService,
    TepApiService,
    TepSyncService,
    FuzzyDedupService,
    EventOverrideService,
    PostEditQueueService,
    EventQualityService,
  ],
  exports: [
    CatalogService,
    RegionService,
    ReviewService,
    TcApiService,
    TcGrpcService,
    TcSyncService,
    TepApiService,
    TepSyncService,
    FuzzyDedupService,
    EventOverrideService,
    PostEditQueueService,
    EventQualityService,
  ],
})
export class CatalogModule {}
