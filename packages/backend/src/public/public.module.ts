import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PromoModule } from '../promo/promo.module';
import { PublicFeatureFlagsController } from './public-feature-flags.controller';
import { PromoBlocksPublicController } from './promo-blocks.controller';
import { PromoBlocksPublicService } from './promo-blocks.service';
import { PromoCollectionsPublicController } from './promo-collections.controller';
import { PromoPlacementBlocksPublicController } from './promo-placement-blocks.controller';
import { PromoPlacementBlocksPublicService } from './promo-placement-blocks.service';

@Module({
  imports: [PrismaModule, PromoModule],
  controllers: [
    PublicFeatureFlagsController,
    PromoBlocksPublicController,
    PromoCollectionsPublicController,
    PromoPlacementBlocksPublicController,
  ],
  providers: [PromoBlocksPublicService, PromoPlacementBlocksPublicService],
})
export class PublicModule {}
