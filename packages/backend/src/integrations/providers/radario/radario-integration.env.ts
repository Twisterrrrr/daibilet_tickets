import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Env для Radario (Wave 1 prep). Реальные пути API — только из официальной документации после доступа.
 */
@Injectable()
export class RadarioIntegrationEnv {
  constructor(private readonly config: ConfigService) {}

  getBaseUrl(): string | undefined {
    const v = this.config.get<string>('RADARIO_BASE_URL');
    return v?.trim() || undefined;
  }

  getBearerToken(): string | undefined {
    const v = this.config.get<string>('RADARIO_BEARER_TOKEN');
    return v?.trim() || undefined;
  }

  isReady(): boolean {
    return Boolean(this.getBaseUrl() && this.getBearerToken());
  }
}
