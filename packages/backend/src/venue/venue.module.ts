import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CatalogModule } from '../catalog/catalog.module';
import { VenueService } from './venue.service';
import { VenueController } from './venue.controller';

@Module({
  imports: [PrismaModule, CatalogModule],
  providers: [VenueService],
  controllers: [VenueController],
  exports: [VenueService],
})
export class VenueModule {}
