import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { UploadService } from '../upload/upload.service';
import { SupplierJwtGuard, SupplierRoles, SupplierRolesGuard } from './supplier.guard';

@ApiTags('supplier-upload')
@Controller('supplier/upload')
@UseGuards(SupplierJwtGuard, SupplierRolesGuard)
@ApiBearerAuth()
export class SupplierUploadController {
  constructor(private readonly upload: UploadService) {}

  @Post('image')
  @SupplierRoles('OWNER', 'MANAGER', 'CONTENT')
  @ApiOperation({ summary: 'Загрузка изображения (кабинет поставщика): вернёт URL и thumbUrl' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const processed = await this.upload.processAndSave(file);
    return {
      url: processed.url,
      thumbUrl: processed.thumbUrl,
      filename: processed.filename,
      thumbFilename: processed.thumbFilename,
    };
  }
}

