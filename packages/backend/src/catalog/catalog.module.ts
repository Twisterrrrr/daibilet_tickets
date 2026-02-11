import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { TcApiService } from './tc-api.service';
import { TcGrpcService } from './tc-grpc.service';
import { TcSyncService } from './tc-sync.service';
import { TepApiService } from './tep-api.service';
import { TepSyncService } from './tep-sync.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    TcApiService,
    TcGrpcService,
    TcSyncService,
    TepApiService,
    TepSyncService,
  ],
  exports: [
    CatalogService,
    TcApiService,
    TcGrpcService,
    TcSyncService,
    TepApiService,
    TepSyncService,
  ],
})
export class CatalogModule {}
