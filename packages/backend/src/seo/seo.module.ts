import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { SeoAdminController, SeoPublicController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [AuthModule],
  providers: [SeoService],
  controllers: [SeoPublicController, SeoAdminController],
  exports: [SeoService],
})
export class SeoModule {}
