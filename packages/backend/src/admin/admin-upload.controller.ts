import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { UploadService } from '../upload/upload.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/upload')
export class AdminUploadController {
  constructor(private readonly upload: UploadService) {}

  @Post('image')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Загрузка изображения (админка): вернёт URL и thumbUrl' })
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

