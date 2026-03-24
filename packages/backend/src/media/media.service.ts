import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CloudinaryMediaService } from './cloudinary-media.service';
import { MediaImageUploadResultDto } from './dto/media-image.dto';

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

/** Лимит размера одного файла (байты). Переопределяется MEDIA_MAX_FILE_BYTES. */
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly cloudinary: CloudinaryMediaService,
    private readonly config: ConfigService,
  ) {}

  private maxBytes(): number {
    const raw = this.config.get<string>('MEDIA_MAX_FILE_BYTES');
    if (!raw) return DEFAULT_MAX_BYTES;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
  }

  validateImageFile(file: Express.Multer.File): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Файл не передан или пустой');
    }
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        `Допустимые форматы: JPEG, PNG, WebP, AVIF, GIF. Получено: ${file.mimetype}`,
      );
    }
    const max = this.maxBytes();
    if (file.size > max) {
      throw new BadRequestException(
        `Максимальный размер файла: ${Math.round(max / (1024 * 1024))} МБ`,
      );
    }
  }

  async uploadImages(files: Express.Multer.File[]): Promise<MediaImageUploadResultDto[]> {
    if (!files?.length) {
      throw new BadRequestException('Не переданы файлы (поле files)');
    }
    const maxFiles = Math.min(
      parseInt(this.config.get<string>('MEDIA_MAX_FILES_PER_REQUEST') ?? '20', 10) || 20,
      50,
    );
    if (files.length > maxFiles) {
      throw new BadRequestException(`Слишком много файлов за один запрос (макс. ${maxFiles})`);
    }

    const out: MediaImageUploadResultDto[] = [];
    for (const file of files) {
      try {
        this.validateImageFile(file);
        const dto = await this.cloudinary.uploadBuffer(file.buffer, file.originalname);
        out.push(dto);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Media upload failed: ${msg}`);
        throw e instanceof BadRequestException ? e : new BadRequestException('Не удалось загрузить изображение');
      }
    }
    return out;
  }

  async deleteByPublicIds(publicIds: string[]): Promise<{ deleted: number }> {
    const ids = [
      ...new Set(
        (publicIds || [])
          .filter((x) => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim()),
      ),
    ];
    if (!ids.length) {
      throw new BadRequestException('Укажите publicIds');
    }
    await this.cloudinary.destroyMany(ids);
    return { deleted: ids.length };
  }
}
