import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { access, mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';

import { StorageProvider } from './storage.provider';

/**
 * Локальное хранилище файлов.
 * Файлы сохраняются на диск, раздаются через Nginx (или напрямую через static serve).
 *
 * В production: /var/www/uploads/ → Nginx location /uploads/ { root /var/www; }
 * В dev: ./uploads/ → ServeStaticModule или прямой доступ через /uploads/

 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir: string;
  private readonly publicPath: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get('UPLOAD_DIR', join(process.cwd(), 'uploads'));
    this.publicPath = this.config.get('UPLOAD_PUBLIC_PATH', '/uploads');
  }

  async save(filename: string, buffer: Buffer): Promise<string> {
    const dir = join(this.uploadDir, this.getSubDir(filename));
    await mkdir(dir, { recursive: true });

    const filePath = join(dir, filename);
    await writeFile(filePath, buffer);

    this.logger.debug(`File saved: ${filePath}`);
    return this.getUrl(filename);
  }

  async delete(filename: string): Promise<void> {
    const filePath = join(this.uploadDir, this.getSubDir(filename), filename);
    try {
      await access(filePath);
      await unlink(filePath);
      this.logger.debug(`File deleted: ${filePath}`);
    } catch {
      // File doesn't exist — ok
    }
  }

  getUrl(filename: string): string {
    return `${this.publicPath}/${this.getSubDir(filename)}/${filename}`;
  }

  /**
   * Подкаталог на основе первых 2 символов filename (для распределения файлов).
   */
  private getSubDir(filename: string): string {
    return filename.substring(0, 2);
  }
}
