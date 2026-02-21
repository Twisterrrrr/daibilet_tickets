import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getThrottleConfig, getThrottlerOptions } from '../throttle.util';

describe('throttle.util', () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it('returns default config when env is empty', () => {
    delete process.env.THROTTLE_TTL;
    delete process.env.THROTTLE_LIMIT;
    const c = getThrottleConfig();
    expect(c.default).toEqual({ ttl: 60_000, limit: 30 });
  });

  it('parses THROTTLE_TTL and THROTTLE_LIMIT', () => {
    process.env.THROTTLE_TTL = '120000';
    process.env.THROTTLE_LIMIT = '100';
    const c = getThrottleConfig();
    expect(c.default).toEqual({ ttl: 120_000, limit: 100 });
  });

  it('parses THROTTLE_AUTH_*', () => {
    process.env.THROTTLE_AUTH_TTL = '60000';
    process.env.THROTTLE_AUTH_LIMIT = '3';
    const c = getThrottleConfig();
    expect(c.auth).toEqual({ ttl: 60_000, limit: 3 });
  });

  it('returns single default throttler', () => {
    const opts = getThrottlerOptions();
    expect(opts).toHaveLength(1);
    expect(opts[0].name).toBe('default');
    expect(opts[0].ttl).toBe(60_000);
    expect(opts[0].limit).toBe(30);
  });
});
