import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { SubcategoryPolicyService } from '../subcategories/subcategory-policy.service';
import { PromoCollectionResolverService } from './promo-collection-resolver.service';

@Module({
  imports: [PrismaModule],
  providers: [PromoCollectionResolverService, SubcategoryPolicyService],
  exports: [PromoCollectionResolverService],
})
export class PromoModule {}
