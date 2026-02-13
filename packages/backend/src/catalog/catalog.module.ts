import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ReviewService } from './review.service';
import { TcApiService } from './tc-api.service';
import { TcGrpcService } from './tc-grpc.service';
import { TcSyncService } from './tc-sync.service';
import { TepApiService } from './tep-api.service';
import { TepSyncService } from './tep-sync.service';
import { AdminModule } from '../admin/admin.module';
import { QUEUE_EMAILS } from '../queue/queue.module';

@Module({
  imports: [
    AdminModule,
    BullModule.registerQueue({ name: QUEUE_EMAILS }),
  ],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    ReviewService,
    TcApiService,
    TcGrpcService,
    TcSyncService,
    TepApiService,
    TepSyncService,
  ],
  exports: [
    CatalogService,
    ReviewService,
    TcApiService,
    TcGrpcService,
    TcSyncService,
    TepApiService,
    TepSyncService,
  ],
})
export class CatalogModule {}
