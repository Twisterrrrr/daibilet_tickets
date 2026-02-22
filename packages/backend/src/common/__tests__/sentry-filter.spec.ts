/**
 * Unit: beforeSend не отправляет 4xx в Sentry.
 * Логика совпадает с main.ts Sentry.init beforeSend.
 */

import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

function createBeforeSend() {
  return (event: unknown, hint: { originalException?: unknown }) => {
    const ex = hint?.originalException;
    if (ex && typeof (ex as HttpException).getStatus === 'function') {
      const status = (ex as HttpException).getStatus();
      if (status >= 400 && status < 500) return null;
    }
    return event;
  };
}

describe('Sentry beforeSend filter', () => {
  it('returns null for 4xx HttpException', () => {
    const fn = createBeforeSend();
    const ex = new HttpException('Bad Request', 400);
    const result = fn({}, { originalException: ex });
    expect(result).toBeNull();
  });

  it('returns event for 5xx', () => {
    const fn = createBeforeSend();
    const ex = new HttpException('Server Error', 500);
    const ev = { id: 'test' };
    const result = fn(ev, { originalException: ex });
    expect(result).toBe(ev);
  });

  it('returns event for non-HTTP exception', () => {
    const fn = createBeforeSend();
    const ev = { id: 'test' };
    const result = fn(ev, { originalException: new Error('Unknown') });
    expect(result).toBe(ev);
  });
});
