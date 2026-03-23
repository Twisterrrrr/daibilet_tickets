import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SeoAdminController, SeoPublicController } from './seo.controller';
import { SeoService } from './seo.service';
import { TagSeoRoutingService } from './tag-seo-routing.service';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [SeoService, TagSeoRoutingService],
  controllers: [SeoPublicController, SeoAdminController],
  exports: [SeoService],
})
export class SeoModule {}
