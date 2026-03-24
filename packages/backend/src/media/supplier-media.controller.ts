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

import { MediaDeleteBodyDto } from './dto/media-image.dto';
import { MediaService } from './media.service';
import { SupplierJwtGuard, SupplierRoles, SupplierRolesGuard } from '../supplier/supplier.guard';

const UPLOAD_MEMORY_LIMIT = 15 * 1024 * 1024;

@ApiTags('supplier-media')
@ApiBearerAuth()
@UseGuards(SupplierJwtGuard, SupplierRolesGuard)
@Controller('supplier/media')
export class SupplierMediaController {
  constructor(private readonly media: MediaService) {}

  @Post('images')
  @SupplierRoles('OWNER', 'MANAGER', 'CONTENT')
  @ApiOperation({ summary: 'Загрузка изображений в Cloudinary (кабинет поставщика)' })
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
  @SupplierRoles('OWNER', 'MANAGER', 'CONTENT')
  @ApiOperation({ summary: 'Удаление изображений по publicId' })
  async deleteImages(@Body() body: MediaDeleteBodyDto) {
    return this.media.deleteByPublicIds(body.publicIds ?? []);
  }
}
