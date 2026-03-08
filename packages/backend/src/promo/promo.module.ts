import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PromoCollectionResolverService } from './promo-collection-resolver.service';

@Module({
  imports: [PrismaModule],
  providers: [PromoCollectionResolverService],
  exports: [PromoCollectionResolverService],
})
export class PromoModule {}
