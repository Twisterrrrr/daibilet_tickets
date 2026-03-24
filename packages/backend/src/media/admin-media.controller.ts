import {
  Body,
  Controller,
  Delete,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { MediaDeleteBodyDto } from './dto/media-image.dto';
import { MediaService } from './media.service';

const UPLOAD_MEMORY_LIMIT = 15 * 1024 * 1024;

@ApiTags('admin-media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/media')
export class AdminMediaController {
  constructor(private readonly media: MediaService) {}

  @Post('images')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Загрузка изображений в Cloudinary (multipart, поле files)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD_MEMORY_LIMIT },
    }),
  )
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    const list = files ?? [];
    return this.media.uploadImages(list);
  }

  @Delete('images')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Удаление изображений в Cloudinary по publicId' })
  async deleteImages(@Body() body: MediaDeleteBodyDto) {
    return this.media.deleteByPublicIds(body.publicIds ?? []);
  }
}
