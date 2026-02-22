import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CacheService } from '../../cache/cache.service';
import { LoginBruteForceService } from '../login-brute-force.service';

describe('LoginBruteForceService', () => {
  let service: LoginBruteForceService;
  let cacheGet: ReturnType<typeof vi.fn>;
  let cacheSet: ReturnType<typeof vi.fn>;
  let cacheDel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cacheGet = vi.fn().mockResolvedValue(null);
    cacheSet = vi.fn().mockResolvedValue(undefined);
    cacheDel = vi.fn().mockResolvedValue(undefined);

    const cache = {
      get: cacheGet,
      set: cacheSet,
      del: cacheDel,
    } as unknown as CacheService;

    const config = {
      get: vi.fn((key: string, def: unknown) => def),
    } as unknown as ConfigService;

    service = new LoginBruteForceService(cache, config);
  });

  it('checkBlocked returns not blocked when no data', async () => {
    const r = await service.checkBlocked('1.2.3.4', 'a@b.com');
    expect(r.blocked).toBe(false);
  });

  it('recordFailedAttempt increments and blocks after N attempts', async () => {
    let stored: { attempts: number; blockedUntil?: number } | null = null;
    cacheGet.mockImplementation(() => Promise.resolve(stored));
    cacheSet.mockImplementation((_k: string, val: { attempts: number; blockedUntil?: number }) => {
      stored = val;
      return Promise.resolve();
    });

    for (let i = 0; i < 4; i++) {
      const r = await service.recordFailedAttempt('1.2.3.4', 'a@b.com');
      expect(r.blocked).toBe(false);
    }

    const r = await service.recordFailedAttempt('1.2.3.4', 'a@b.com');
    expect(r.blocked).toBe(true);
    expect(r.retryAfterSec).toBe(600);
    expect(cacheSet).toHaveBeenLastCalledWith(
      expect.stringContaining('login:bf:'),
      expect.objectContaining({ attempts: 5, blockedUntil: expect.any(Number) }),
      600,
    );
  });

  it('recordSuccess clears cache', async () => {
    await service.recordSuccess('1.2.3.4', 'a@b.com');
    expect(cacheDel).toHaveBeenCalledWith(expect.stringContaining('login:bf:'));
  });

  it('checkBlocked returns blocked when blockedUntil in future', async () => {
    const blockedUntil = Date.now() + 120_000;
    cacheGet.mockResolvedValue({ attempts: 5, blockedUntil });

    const r = await service.checkBlocked('1.2.3.4', 'a@b.com');
    expect(r.blocked).toBe(true);
    expect(r.retryAfterSec).toBeGreaterThan(100);
  });
});
