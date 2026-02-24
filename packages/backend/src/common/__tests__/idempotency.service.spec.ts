/**
 * IdempotencyService unit tests — Batch 1 Ops Foundation.
 *
 * Acceptance: DONE возвращает cached response; дубли блокируются.
 */

import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IdempotencyService } from '../idempotency.service';

function createMockPrisma() {
  const keys = new Map<string, Record<string, unknown>>();

  const keyOf = (scope: string, key: string) => `${scope}:${key}`;

  return {
    keys,
    idempotencyKey: {
      findUnique: vi.fn().mockImplementation(({ where }: { where: { scope_key?: { scope: string; key: string } } }) => {
        const k = where.scope_key ? keyOf(where.scope_key.scope, where.scope_key.key) : null;
        return (k && keys.get(k)) || null;
      }),
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        const scope = data.scope as string;
        const key = data.key as string;
        const k = keyOf(scope, key);
        if (keys.has(k)) {
          const err = new Error('Unique constraint') as Error & { code?: string };
          err.code = 'P2002';
          throw err;
        }
        const record = {
          id: 'id-' + k,
          scope,
          key,
          status: data.status,
          response: data.response ?? null,
          metaJson: data.metaJson ?? null,
        };
        keys.set(k, record);
        return record;
      }),
      update: vi.fn().mockImplementation(({ where, data }: { where: { scope_key: { scope: string; key: string } }; data: Record<string, unknown> }) => {
        const k = keyOf(where.scope_key.scope, where.scope_key.key);
        const record = keys.get(k);
        if (record) Object.assign(record, data);
        return Promise.resolve(record);
      }),
      delete: vi.fn().mockImplementation(({ where }: { where: { scope_key: { scope: string; key: string } } }) => {
        const k = keyOf(where.scope_key.scope, where.scope_key.key);
        keys.delete(k);
        return Promise.resolve({ id: k });
      }),
    },
  };
}

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new IdempotencyService(prisma as unknown as any);
  });

  it('выполняет handler при первом вызове и кэширует результат', async () => {
    const handler = vi.fn().mockResolvedValue({ pkgId: 'pkg-123' });

    const result1 = await service.run('CHECKOUT_CREATE' as any, 'create:u1:hash1', handler);
    expect(result1).toEqual({ pkgId: 'pkg-123' });
    expect(handler).toHaveBeenCalledTimes(1);

    const result2 = await service.run('CHECKOUT_CREATE' as any, 'create:u1:hash1', handler);
    expect(result2).toEqual({ pkgId: 'pkg-123' });
    expect(handler).toHaveBeenCalledTimes(1); // не вызывался повторно
  });

  it('блокирует дубликат при IN_PROGRESS (одновременные запросы)', async () => {
    // Эмулируем: первый запрос уже создал запись IN_PROGRESS
    prisma.keys.set('CHECKOUT_CREATE:create:u1:hash1', {
      id: 'id-1',
      scope: 'CHECKOUT_CREATE',
      key: 'create:u1:hash1',
      status: 'IN_PROGRESS',
      response: null,
    });

    const handler = vi.fn().mockResolvedValue({ pkgId: 'pkg-123' });

    await expect(
      service.run('CHECKOUT_CREATE' as any, 'create:u1:hash1', handler),
    ).rejects.toThrow(ConflictException);

    expect(handler).not.toHaveBeenCalled();
  });

  it('после FAILED разрешает повторить', async () => {
    prisma.keys.set('EMAIL_SEND:tmpl:user@x.com', {
      id: 'id-1',
      scope: 'EMAIL_SEND',
      key: 'tmpl:user@x.com',
      status: 'FAILED',
      response: null,
    });

    // create должен быть вызван — мы не возвращаем cached, т.к. FAILED
    const handler = vi.fn().mockResolvedValue({ sent: true });

    const result = await service.run('EMAIL_SEND' as any, 'tmpl:user@x.com', handler);
    expect(result).toEqual({ sent: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('при ошибке handler помечает запись FAILED', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Send failed'));

    await expect(
      service.run('EMAIL_SEND' as any, 'tmpl:fail@x.com', handler),
    ).rejects.toThrow('Send failed');

    const record = prisma.keys.get('EMAIL_SEND:tmpl:fail@x.com');
    expect(record?.status).toBe('FAILED');
  });
});
