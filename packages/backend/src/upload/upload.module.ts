import { Global, Module } from '@nestjs/common';

import { LocalStorageProvider } from './local-storage.provider';
import { STORAGE_PROVIDER } from './storage.provider';
import { UploadService } from './upload.service';

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
