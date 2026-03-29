import { Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class FinanceDocumentStorageService {
  private readonly root = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

  buildBaseDir(params: {
    operatorId: string;
    documentType: string;
    documentNumber: string;
    documentDate: Date;
  }): string {
    const year = String(params.documentDate.getUTCFullYear());
    const month = String(params.documentDate.getUTCMonth() + 1).padStart(2, '0');
    return join(
      this.root,
      'documents',
      params.operatorId,
      year,
      month,
      params.documentType,
      params.documentNumber,
    );
  }

  async saveText(baseDir: string, fileName: string, content: string): Promise<string> {
    await mkdir(baseDir, { recursive: true });
    const absPath = join(baseDir, fileName);
    await writeFile(absPath, content, 'utf-8');
    return this.toRelative(absPath);
  }

  async saveBinary(baseDir: string, fileName: string, content: Uint8Array): Promise<string> {
    await mkdir(baseDir, { recursive: true });
    const absPath = join(baseDir, fileName);
    await writeFile(absPath, content);
    return this.toRelative(absPath);
  }

  /**
   * Чтение файла по относительному ключу из БД (путь вида documents/... от корня UPLOAD_DIR).
   */
  async readBinaryRelative(storageKey: string): Promise<Buffer> {
    const normalized = storageKey.replace(/\\/g, '/').replace(/^\/?uploads\//, '');
    if (normalized.includes('..')) {
      throw new NotFoundException('Invalid storage key');
    }
    const absPath = join(this.root, normalized);
    try {
      return await readFile(absPath);
    } catch {
      throw new NotFoundException('File not found');
    }
  }

  private toRelative(absPath: string): string {
    const normalized = absPath.replace(/\\/g, '/');
    const marker = '/uploads/';
    const idx = normalized.indexOf(marker);
    if (idx >= 0) return normalized.slice(idx + 1);
    return normalized;
  }
}

