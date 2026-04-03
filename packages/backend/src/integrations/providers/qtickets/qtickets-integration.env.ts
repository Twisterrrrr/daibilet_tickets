import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Env для Qtickets (Wave 1 prep). Имя заголовка ключа — на случай разных вариантов в кабинете.
 */
@Injectable()
export class QticketsIntegrationEnv {
  constructor(private readonly config: ConfigService) {}

  getBaseUrl(): string | undefined {
    const v = this.config.get<string>('QTICKETS_BASE_URL');
    return v?.trim() || undefined;
  }

  getApiKey(): string | undefined {
    const v = this.config.get<string>('QTICKETS_API_KEY');
    return v?.trim() || undefined;
  }

  /** Например X-Api-Key или Authorization — уточнить по доке Qtickets. */
  getApiKeyHeaderName(): string {
    return (this.config.get<string>('QTICKETS_API_KEY_HEADER') ?? 'X-Api-Key').trim() || 'X-Api-Key';
  }

  isReady(): boolean {
    return Boolean(this.getBaseUrl() && this.getApiKey());
  }
}
