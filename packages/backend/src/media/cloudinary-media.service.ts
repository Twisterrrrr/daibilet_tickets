import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

import { MediaImageUploadResultDto } from './dto/media-image.dto';

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

@Injectable()
export class CloudinaryMediaService {
  private readonly logger = new Logger(CloudinaryMediaService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      this.configured = true;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  ensureConfigured(): void {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Cloudinary не настроен: задайте CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
      );
    }
  }

  private folderPrefix(): string | undefined {
    const f = this.config.get<string>('CLOUDINARY_FOLDER');
    return f?.replace(/^\/+|\/+$/g, '') || undefined;
  }

  /**
   * Загрузка из буфера (Multer memory). originalName — только для метаданных и логов.
   */
  async uploadBuffer(buffer: Buffer, originalName: string): Promise<MediaImageUploadResultDto> {
    this.ensureConfigured();

    const folder = this.folderPrefix();
    const safeName = (originalName || 'image').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folder || undefined,
          resource_type: 'image',
          use_filename: true,
          unique_filename: true,
          filename_override: safeName || undefined,
        },
        (err, res) => {
          if (err || !res) {
            reject(err ?? new Error('Empty Cloudinary response'));
            return;
          }
          resolve(res as unknown as CloudinaryUploadResult);
        },
      );
      stream.end(buffer);
    });

    const dto: MediaImageUploadResultDto = {
      url: result.secure_url || result.url,
      secureUrl: result.secure_url || result.url,
      width: result.width ?? 0,
      height: result.height ?? 0,
      format: result.format ?? '',
      bytes: result.bytes ?? buffer.length,
      originalFilename: safeName,
      provider: 'CLOUDINARY',
      publicId: result.public_id,
    };

    this.logger.log(`Cloudinary upload ok: ${dto.publicId} (${dto.bytes} bytes)`);
    return dto;
  }

  async destroy(publicId: string): Promise<void> {
    this.ensureConfigured();
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    if (res.result !== 'ok' && res.result !== 'not found') {
      this.logger.warn(`Cloudinary destroy: ${publicId} → ${res.result}`);
    }
  }

  async destroyMany(publicIds: string[]): Promise<void> {
    await Promise.all(publicIds.filter(Boolean).map((id) => this.destroy(id)));
  }
}
