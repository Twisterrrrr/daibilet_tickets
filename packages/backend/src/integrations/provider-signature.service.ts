import { Injectable, Logger } from '@nestjs/common';

/**
 * TODO: верификация подписи / mTLS для входящих webhooks ticket providers.
 * Не смешивать с платёжным контуром YooKassa.
 */
@Injectable()
export class ProviderSignatureService {
  private readonly logger = new Logger(ProviderSignatureService.name);

  verifyOrWarn(providerLabel: string): void {
    this.logger.debug(`ProviderSignatureService: verification not implemented for ${providerLabel}`);
  }
}
