import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EdoProviderType } from '@/prisma-client';

import type { EdoProvider } from '../domain/edo-provider.interface';
import { EdoProviderNotImplementedError } from '../domain/edo.errors';
import { NoopEdoProvider } from './noop-edo.provider';

@Injectable()
export class EdoProviderRegistry {
  private readonly noop = new NoopEdoProvider();
  private providerOverride: EdoProviderType | null = null;

  constructor(private readonly config: ConfigService) {
    const envProvider = this.config.get<string>('EDO_PROVIDER');
    if (envProvider === 'NOOP' || envProvider === 'DIADOK') {
      this.providerOverride = envProvider as EdoProviderType;
    }
  }

  /**
   * Получить провайдера по типу.
   * NOOP — всегда доступен.
   * DIADOK — пока не реализован, выбрасывает EdoProviderNotImplementedError.
   */
  getProvider(type: EdoProviderType): EdoProvider {
    if (type === 'NOOP') {
      return this.noop;
    }
    if (type === 'DIADOK') {
      throw new EdoProviderNotImplementedError('DIADOK');
    }
    throw new EdoProviderNotImplementedError(String(type));
  }

  /**
   * Получить провайдера из ENV (EDO_PROVIDER).
   * Если не задан или невалиден — возвращает NOOP.
   */
  getDefaultProvider(): EdoProvider {
    const env = this.providerOverride ?? 'NOOP';
    return this.getProvider(env);
  }
}
