import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { STORAGE_PROVIDER, StorageProvider } from './storage.provider';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

export interface ProcessedImage {
  /** Основное изображение (1200px max) */
  url: string;
  filename: string;
  /** Превью (300px) */
  thumbUrl: string;
  thumbFilename: string;
}

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DIMENSION = 1200;
const THUMB_DIMENSION = 300;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /**
   * Обработать и сохранить изображение.
   * Конвертация в WebP, ресайз до 1200px + thumbnail 300px.
   */
  async processAndSave(file: Express.Multer.File): Promise<ProcessedImage> {
    // Валидация
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Допустимые форматы: JPEG, PNG, WebP. Получен: ${file.mimetype}`,
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Максимальный размер файла: 5 МБ. Получено: ${(file.size / 1024 / 1024).toFixed(1)} МБ`,
      );
    }

    const id = randomUUID();
    const filename = `${id}.webp`;
    const thumbFilename = `${id}-thumb.webp`;

    try {
      // Основное изображение: ресайз + WebP
      const mainBuffer = await sharp(file.buffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      // Thumbnail: ресайз + WebP
      const thumbBuffer = await sharp(file.buffer)
        .resize(THUMB_DIMENSION, THUMB_DIMENSION, { fit: 'cover' })
        .webp({ quality: 75 })
        .toBuffer();

      // Сохранить оба
      const [url, thumbUrl] = await Promise.all([
        this.storage.save(filename, mainBuffer),
        this.storage.save(thumbFilename, thumbBuffer),
      ]);

      this.logger.log(`Image processed: ${filename} (${(mainBuffer.length / 1024).toFixed(0)} KB)`);

      return { url, filename, thumbUrl, thumbFilename };
    } catch (err: any) {
      this.logger.error(`Image processing failed: ${err.message}`);
      throw new BadRequestException('Не удалось обработать изображение');
    }
  }

  /**
   * Удалить изображение и его thumbnail.
   */
  async deleteImage(filename: string, thumbFilename: string): Promise<void> {
    await Promise.all([
      this.storage.delete(filename),
      this.storage.delete(thumbFilename),
    ]);
  }
}
