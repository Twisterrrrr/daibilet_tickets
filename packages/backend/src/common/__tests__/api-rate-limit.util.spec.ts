import { describe, expect, it, vi } from 'vitest';

import { createApiLimiter, runWithLimit, withRetry } from '../api-rate-limit.util';

describe('api-rate-limit.util', () => {
  describe('withRetry', () => {
    it('returns data on first success', async () => {
      const fn = vi.fn().mockResolvedValue(42);
      const result = await withRetry(fn);
      expect(result.data).toBe(42);
      expect(result.retries).toBe(0);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on 429 and succeeds', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error('API returned 429')).mockResolvedValueOnce('ok');

      const result = await withRetry(fn, { initialBackoffMs: 5 });
      expect(result.data).toBe('ok');
      expect(result.retries).toBe(1);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries on 5xx and succeeds', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error('API returned 502')).mockResolvedValueOnce('ok');

      const result = await withRetry(fn, { initialBackoffMs: 5 });
      expect(result.data).toBe('ok');
      expect(result.retries).toBe(1);
    });

    it('does not retry on 4xx (except 429)', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('API returned 404'));
      await expect(withRetry(fn, { maxRetries: 2 })).rejects.toThrow('404');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('throws after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('API returned 503'));
      await expect(withRetry(fn, { maxRetries: 2, initialBackoffMs: 5 })).rejects.toThrow('503');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('createApiLimiter', () => {
    it('parses env TC_TEP_CONCURRENCY', () => {
      const orig = process.env.TC_TEP_CONCURRENCY;
      process.env.TC_TEP_CONCURRENCY = '5';
      const limit = createApiLimiter('TC_TEP_CONCURRENCY');
      expect(limit).toBeDefined();
      process.env.TC_TEP_CONCURRENCY = orig;
    });
  });

  describe('runWithLimit', () => {
    it('runs task and returns result', async () => {
      const result = await runWithLimit(() => Promise.resolve('done'));
      expect(result).toBe('done');
    });
  });
});
