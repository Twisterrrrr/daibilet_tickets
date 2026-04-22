import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import {
  ProviderIntegrationNotConfiguredError,
  TicketProviderHttpError,
} from '../errors/provider-integration.errors';
import { joinTicketProviderUrl, ticketProviderJsonFetch } from '../http/ticket-provider-json-fetch';
import { RadarioHttpService } from '../providers/radario/radario-http.service';
import { RadarioIntegrationEnv } from '../providers/radario/radario-integration.env';
import { QticketsHttpService } from '../providers/qtickets/qtickets-http.service';
import { QticketsIntegrationEnv } from '../providers/qtickets/qtickets-integration.env';

function mockConfig(getImpl: (key: string) => string | undefined): ConfigService {
  return { get: (key: string) => getImpl(key) } as unknown as ConfigService;
}

describe('joinTicketProviderUrl', () => {
  it('joins base and path without double slashes', () => {
    expect(joinTicketProviderUrl('https://api.example.com/', '/v1/x')).toBe('https://api.example.com/v1/x');
    expect(joinTicketProviderUrl('https://api.example.com', 'v1/x')).toBe('https://api.example.com/v1/x');
  });
});

describe('RadarioHttpService / QticketsHttpService (Wave 1 prep)', () => {
  it('Radario: getJson throws when env missing', async () => {
    const env = new RadarioIntegrationEnv(mockConfig(() => undefined));
    const http = new RadarioHttpService(env);
    expect(http.isReady()).toBe(false);
    await expect(http.getJson('/any')).rejects.toBeInstanceOf(ProviderIntegrationNotConfiguredError);
  });

  it('Qtickets: getJson throws when env missing', async () => {
    const env = new QticketsIntegrationEnv(mockConfig(() => undefined));
    const http = new QticketsHttpService(env);
    expect(http.isReady()).toBe(false);
    await expect(http.getJson('/any')).rejects.toBeInstanceOf(ProviderIntegrationNotConfiguredError);
  });

  it('Radario: isReady true when base + bearer set', () => {
    const env = new RadarioIntegrationEnv(
      mockConfig((k) => {
        if (k === 'RADARIO_BASE_URL') return 'https://radario.example';
        if (k === 'RADARIO_BEARER_TOKEN') return 't';
        return undefined;
      }),
    );
    expect(env.isReady()).toBe(true);
    const http = new RadarioHttpService(env);
    expect(http.isReady()).toBe(true);
  });
});

describe('ticketProviderJsonFetch', () => {
  it('parses JSON on 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '{"a":1}',
      }),
    );
    try {
      const out = await ticketProviderJsonFetch<{ a: number }>({
        url: 'https://x.test/ok',
        providerLabel: 'TEST',
      });
      expect(out).toEqual({ a: 1 });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('throws TicketProviderHttpError on non-OK', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      }),
    );
    try {
      await expect(
        ticketProviderJsonFetch({ url: 'https://x.test/bad', providerLabel: 'TEST' }),
      ).rejects.toBeInstanceOf(TicketProviderHttpError);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
