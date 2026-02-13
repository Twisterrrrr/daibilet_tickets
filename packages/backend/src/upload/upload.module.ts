import { Module, Global } from '@nestjs/common';
import { UploadService } from './upload.service';
import { LocalStorageProvider } from './local-storage.provider';
import { STORAGE_PROVIDER } from './storage.provider';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: LocalStorageProvider,
    },
    UploadService,
  ],
  exports: [UploadService, STORAGE_PROVIDER],
})
export class UploadModule {}
