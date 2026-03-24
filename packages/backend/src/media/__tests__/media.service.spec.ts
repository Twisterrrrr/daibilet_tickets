import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import { CloudinaryMediaService } from '../cloudinary-media.service';
import { MediaService } from '../media.service';

function multerFile(over: Partial<Express.Multer.File> & { buffer: Buffer }): Express.Multer.File {
  return {
    fieldname: 'files',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: over.buffer.length,
    destination: '',
    filename: '',
    path: '',
    stream: null as unknown as NodeJS.ReadableStream,
    ...over,
  } as Express.Multer.File;
}

describe('MediaService', () => {
  const sampleDto = {
    url: 'https://res.cloudinary.com/x/image/upload/v1/a.jpg',
    secureUrl: 'https://res.cloudinary.com/x/image/upload/v1/a.jpg',
    width: 100,
    height: 80,
    format: 'jpg',
    bytes: 10,
    originalFilename: 'test.jpg',
    provider: 'CLOUDINARY' as const,
    publicId: 'folder/test',
  };

  function createService(config: Record<string, string | undefined>) {
    const configService = {
      get: vi.fn((key: string) => config[key]),
    } as unknown as ConfigService;
    const cloudinary = {
      uploadBuffer: vi.fn().mockResolvedValue(sampleDto),
      destroyMany: vi.fn().mockResolvedValue(undefined),
    } as unknown as CloudinaryMediaService;
    const service = new MediaService(cloudinary, configService);
    return { service, cloudinary };
  }

  it('validateImageFile: пустой buffer', () => {
    const { service } = createService({});
    expect(() =>
      service.validateImageFile(
        multerFile({ buffer: Buffer.alloc(0), mimetype: 'image/jpeg', size: 0 }),
      ),
    ).toThrow(BadRequestException);
  });

  it('validateImageFile: недопустимый MIME', () => {
    const { service } = createService({});
    expect(() =>
      service.validateImageFile(
        multerFile({ buffer: Buffer.from([1]), mimetype: 'application/pdf', size: 1 }),
      ),
    ).toThrow(BadRequestException);
  });

  it('validateImageFile: превышен размер', () => {
    const { service } = createService({ MEDIA_MAX_FILE_BYTES: '100' });
    expect(() =>
      service.validateImageFile(
        multerFile({ buffer: Buffer.alloc(200), mimetype: 'image/jpeg', size: 200 }),
      ),
    ).toThrow(BadRequestException);
  });

  it('validateImageFile: успех для JPEG', () => {
    const { service } = createService({});
    expect(() =>
      service.validateImageFile(multerFile({ buffer: Buffer.from([1, 2, 3]), mimetype: 'image/jpeg', size: 3 })),
    ).not.toThrow();
  });

  it('uploadImages: без файлов', async () => {
    const { service } = createService({});
    await expect(service.uploadImages([])).rejects.toThrow(BadRequestException);
  });

  it('uploadImages: слишком много файлов', async () => {
    const { service } = createService({ MEDIA_MAX_FILES_PER_REQUEST: '2' });
    const files = [
      multerFile({ buffer: Buffer.from([1]), mimetype: 'image/jpeg', size: 1 }),
      multerFile({ buffer: Buffer.from([2]), mimetype: 'image/jpeg', size: 1 }),
      multerFile({ buffer: Buffer.from([3]), mimetype: 'image/jpeg', size: 1 }),
    ];
    await expect(service.uploadImages(files)).rejects.toThrow(/макс/i);
  });

  it('uploadImages: вызывает Cloudinary и возвращает DTO', async () => {
    const { service, cloudinary } = createService({});
    const files = [multerFile({ buffer: Buffer.from([1, 2]), mimetype: 'image/png', size: 2 })];
    const out = await service.uploadImages(files);
    expect(out).toHaveLength(1);
    expect(out[0].publicId).toBe('folder/test');
    expect(cloudinary.uploadBuffer).toHaveBeenCalledWith(files[0].buffer, files[0].originalname);
  });

  it('deleteByPublicIds: пустой список', async () => {
    const { service } = createService({});
    await expect(service.deleteByPublicIds([])).rejects.toThrow(BadRequestException);
  });

  it('deleteByPublicIds: дедуп и вызов destroyMany', async () => {
    const { service, cloudinary } = createService({});
    const r = await service.deleteByPublicIds(['  a  ', 'a', 'b']);
    expect(r.deleted).toBe(2);
    expect(cloudinary.destroyMany).toHaveBeenCalledWith(['a', 'b']);
  });
});
