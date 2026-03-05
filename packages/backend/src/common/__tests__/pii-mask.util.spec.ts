import { describe, expect, it } from 'vitest';

import { maskAuthorization, maskEmail, maskPhone, maskPii, maskPiiInString, maskSecret } from '../pii-mask.util';

describe('pii-mask.util', () => {
  describe('maskEmail', () => {
    it('masks email keeping structure', () => {
      expect(maskEmail('user@example.com')).toMatch(/^.+.+@.+\..+$/);
      expect(maskEmail('a@b.co')).not.toBe('a@b.co');
    });
    it('returns empty for null/undefined', () => {
      expect(maskEmail(null)).toBe('');
      expect(maskEmail(undefined)).toBe('');
    });
    it('returns mask for invalid email', () => {
      expect(maskEmail('noat')).toBe('***');
    });
  });

  describe('maskPhone', () => {
    it('masks phone keeping last 2 digits', () => {
      const r = maskPhone('+7 999 123-45-67');
      expect(r).toContain('67');
      expect(r).not.toContain('999');
    });
    it('returns empty for null/undefined', () => {
      expect(maskPhone(null)).toBe('');
      expect(maskPhone(undefined)).toBe('');
    });
  });

  describe('maskSecret', () => {
    it('masks long strings', () => {
      const r = maskSecret('mySecretToken123');
      expect(r).not.toBe('mySecretToken123');
      expect(r.length).toBeLessThan(20);
    });
    it('returns *** for short strings', () => {
      expect(maskSecret('ab')).toBe('***');
    });
  });

  describe('maskAuthorization', () => {
    it('masks Bearer token', () => {
      expect(maskAuthorization('Bearer eyJhbGc...')).toBe('Bearer ***');
    });
    it('masks Basic auth', () => {
      expect(maskAuthorization('Basic dXNlcjpwYXNz')).toBe('Basic ***');
    });
  });

  describe('maskPii', () => {
    it('masks email in object', () => {
      const obj = { email: 'test@example.com', name: 'John' };
      const out = maskPii(obj) as Record<string, unknown>;
      expect(out.name).toBe('John');
      expect(out.email).not.toBe('test@example.com');
    });
    it('masks phone in object', () => {
      const obj = { phone: '+79991234567', role: 'user' };
      const out = maskPii(obj) as Record<string, unknown>;
      expect(out.role).toBe('user');
      expect(out.phone).not.toBe('+79991234567');
    });
    it('masks nested password', () => {
      const obj = { user: { password: 'secret123' } };
      const out = maskPii(obj) as Record<string, unknown>;
      expect((out.user as Record<string, unknown>).password).toBe('***');
    });
  });

  describe('maskPiiInString', () => {
    it('masks email in text', () => {
      const s = 'Contact user@example.com for help';
      const out = maskPiiInString(s);
      expect(out).not.toContain('user@example.com');
    });
    it('masks phone in text', () => {
      const s = 'Call +7 999 123-45-67';
      const out = maskPiiInString(s);
      expect(out).not.toContain('999');
    });
    it('returns empty for null/undefined', () => {
      expect(maskPiiInString(null)).toBe('');
      expect(maskPiiInString(undefined)).toBe('');
    });
  });
});
