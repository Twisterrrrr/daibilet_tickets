import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getCorsOrigins, parseCorsOrigins } from '../cors.util';

describe('cors.util', () => {
  describe('parseCorsOrigins', () => {
    it('returns empty for undefined', () => {
      expect(parseCorsOrigins(undefined)).toEqual([]);
    });
    it('parses comma-separated', () => {
      expect(parseCorsOrigins('https://a.com, https://b.com')).toEqual(['https://a.com', 'https://b.com']);
    });
    it('trims spaces', () => {
      expect(parseCorsOrigins('  http://localhost  ,  http://other  ')).toEqual(['http://localhost', 'http://other']);
    });
    it('filters empty', () => {
      expect(parseCorsOrigins('a,,b,')).toEqual(['a', 'b']);
    });
  });

  describe('getCorsOrigins', () => {
    const origEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...origEnv };
    });

    it('returns parsed CORS_ORIGINS when set', () => {
      process.env.CORS_ORIGINS = 'https://daibilet.ru,https://admin.daibilet.ru';
      process.env.CORS_ORIGIN = '';
      expect(getCorsOrigins()).toEqual(['https://daibilet.ru', 'https://admin.daibilet.ru']);
    });
    it('returns DEV_ORIGINS when NODE_ENV is not production and env not set', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.CORS_ORIGINS;
      delete process.env.CORS_ORIGIN;
      const origins = getCorsOrigins();
      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('http://localhost:5173');
    });
    it('returns empty in production when env not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CORS_ORIGINS;
      delete process.env.CORS_ORIGIN;
      expect(getCorsOrigins()).toEqual([]);
    });
  });
});
