import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

/** Ответ загрузки одного изображения в Cloudinary (единый контракт admin/supplier). */
export class MediaImageUploadResultDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  secureUrl!: string;

  @ApiProperty()
  width!: number;

  @ApiProperty()
  height!: number;

  @ApiProperty()
  format!: string;

  @ApiProperty()
  bytes!: number;

  /** Безопасное имя для логов; не используется как путь в БД. */
  @ApiProperty()
  originalFilename!: string;

  @ApiProperty({ enum: ['CLOUDINARY'] })
  provider!: 'CLOUDINARY';

  @ApiProperty({ description: 'Идентификатор в Cloudinary для удаления через API' })
  publicId!: string;
}

export class MediaDeleteBodyDto {
  @ApiProperty({ type: [String], description: 'publicId из ответа Cloudinary' })
  @IsArray()
  @IsString({ each: true })
  publicIds!: string[];
}
