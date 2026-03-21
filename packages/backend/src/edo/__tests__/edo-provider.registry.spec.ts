/**
 * P4: Тесты EdoProviderRegistry.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EdoProviderRegistry } from '../providers/edo-provider.registry';
import { EdoProviderNotImplementedError } from '../domain/edo.errors';

function createMockConfig(overrides: Record<string, string | undefined> = {}) {
  return {
    get: vi.fn().mockImplementation((key: string, defaultValue?: string) => overrides[key] ?? defaultValue),
  };
}

describe('EdoProviderRegistry', () => {
  it('getProvider(NOOP) возвращает NoopEdoProvider', () => {
    const config = createMockConfig();
    const registry = new EdoProviderRegistry(config as unknown as import('@nestjs/config').ConfigService);
    const provider = registry.getProvider('NOOP');
    expect(provider.getProviderType()).toBe('NOOP');
  });

  it('getProvider(DIADOK) выбрасывает EdoProviderNotImplementedError', () => {
    const config = createMockConfig();
    const registry = new EdoProviderRegistry(config as unknown as import('@nestjs/config').ConfigService);
    expect(() => registry.getProvider('DIADOK')).toThrow(EdoProviderNotImplementedError);
  });

  it('getDefaultProvider возвращает NOOP при EDO_PROVIDER=NOOP', () => {
    const config = createMockConfig({ EDO_PROVIDER: 'NOOP' });
    const registry = new EdoProviderRegistry(config as unknown as import('@nestjs/config').ConfigService);
    const provider = registry.getDefaultProvider();
    expect(provider.getProviderType()).toBe('NOOP');
  });

  it('getDefaultProvider возвращает NOOP при отсутствии EDO_PROVIDER', () => {
    const config = createMockConfig();
    const registry = new EdoProviderRegistry(config as unknown as import('@nestjs/config').ConfigService);
    const provider = registry.getDefaultProvider();
    expect(provider.getProviderType()).toBe('NOOP');
  });

  it('getDefaultProvider выбрасывает при EDO_PROVIDER=DIADOK (провайдер не реализован)', () => {
    const config = createMockConfig({ EDO_PROVIDER: 'DIADOK' });
    const registry = new EdoProviderRegistry(config as unknown as import('@nestjs/config').ConfigService);
    expect(() => registry.getDefaultProvider()).toThrow(EdoProviderNotImplementedError);
  });
});
