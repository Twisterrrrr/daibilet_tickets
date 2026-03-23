import { Module } from '@nestjs/common';

import { CatalogLandingsController } from './catalog-landings.controller';
import { LandingController } from './landing.controller';
import { LandingMaterializerService } from './landing-materializer.service';
import { LandingService } from './landing.service';

@Module({
  controllers: [LandingController, CatalogLandingsController],
  providers: [LandingService, LandingMaterializerService],
  exports: [LandingService, LandingMaterializerService],
})
export class LandingModule {}
