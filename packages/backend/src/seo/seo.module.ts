import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeoGeneratorService } from './seo-generator.service';
import { SeoMetaService } from './seo-meta.service';
import { SeoMetaAdminController } from './seo-meta.admin.controller';
import { SeoMetaPublicController } from './seo-meta.public.controller';

@Module({
  imports: [AuthModule],
  providers: [SeoGeneratorService, SeoMetaService],
  controllers: [SeoMetaAdminController, SeoMetaPublicController],
  exports: [SeoGeneratorService, SeoMetaService],
})
export class SeoModule {}
