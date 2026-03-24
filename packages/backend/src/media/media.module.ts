import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AdminMediaController } from './admin-media.controller';
import { CloudinaryMediaService } from './cloudinary-media.service';
import { MediaService } from './media.service';
import { SupplierMediaController } from './supplier-media.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AdminMediaController, SupplierMediaController],
  providers: [CloudinaryMediaService, MediaService],
  exports: [MediaService, CloudinaryMediaService],
})
export class MediaModule {}
