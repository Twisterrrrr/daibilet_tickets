import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module';
import { VenueModule } from '../venue/venue.module';
import { PreviewController } from './preview.controller';
import { PreviewService } from './preview.service';

@Module({
  imports: [CatalogModule, VenueModule],
  providers: [PreviewService],
  controllers: [PreviewController],
  exports: [PreviewService],
})
export class PreviewModule {}

