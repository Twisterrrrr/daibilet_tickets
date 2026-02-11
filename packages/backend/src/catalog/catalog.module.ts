import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { TcApiService } from './tc-api.service';
import { TcSyncService } from './tc-sync.service';
import { TepApiService } from './tep-api.service';
import { TepSyncService } from './tep-sync.service';

@Module({
  controllers: [CatalogController],
  providers: [
    CatalogService,
    TcApiService,
    TcSyncService,
    TepApiService,
    TepSyncService,
  ],
  exports: [
    CatalogService,
    TcApiService,
    TcSyncService,
    TepApiService,
    TepSyncService,
  ],
})
export class CatalogModule {}
