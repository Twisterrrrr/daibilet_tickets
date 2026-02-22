import { Module } from '@nestjs/common';

import { CatalogModule } from '../catalog/catalog.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VenueController } from './venue.controller';
import { VenueService } from './venue.service';

@Module({
  imports: [PrismaModule, CatalogModule],
  providers: [VenueService],
  controllers: [VenueController],
  exports: [VenueService],
})
export class VenueModule {}
