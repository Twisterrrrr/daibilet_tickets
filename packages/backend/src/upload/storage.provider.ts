/**
 * Интерфейс абстракции хранилища файлов.
 * Позволяет заменить LocalStorage на S3/Yandex Object Storage в будущем.
 */
export interface StorageProvider {
  /** Сохранить файл, вернуть публичный URL */
  save(filename: string, buffer: Buffer): Promise<string>;
  /** Удалить файл */
  delete(filename: string): Promise<void>;
  /** Получить публичный URL по filename */
  getUrl(filename: string): string;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
