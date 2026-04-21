import { Module } from '@nestjs/common';

import { CatalogLandingsController } from './catalog-landings.controller';
import { LandingController } from './landing.controller';
import { LandingMaterializerService } from './landing-materializer.service';
import { LandingSeoAuditService } from './landing-seo-audit.service';
import { LandingService } from './landing.service';
import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';

@Module({
  controllers: [LandingController, CatalogLandingsController],
  providers: [LandingService, LandingMaterializerService, LandingSeoAuditService, SubcategoryPolicyService],
  exports: [LandingService, LandingMaterializerService, LandingSeoAuditService, SubcategoryPolicyService],
})
export class LandingModule {}
