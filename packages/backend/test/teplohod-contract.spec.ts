import { describe, expect, it, vi } from 'vitest';

import { TeplohodWidgetsService, normalizeTeplohodExternalId } from '../src/widgets/teplohod/teplohod-widgets.service';
import { getPartnerEventId } from '../../frontend/src/lib/partnerIds';

describe('normalizeTeplohodExternalId', () => {
  it('extracts digits from TEP_ prefix', () => {
    expect(normalizeTeplohodExternalId('TEP_123')).toBe('123');
  });

  it('extracts digits from tep- prefix', () => {
    expect(normalizeTeplohodExternalId('tep-123')).toBe('123');
  });

  it('handles numeric input', () => {
    expect(normalizeTeplohodExternalId(123)).toBe('123');
  });
});

describe('TeplohodWidgetsService.findEvent (contract)', () => {
  it('queries by internal UUID when eventId looks like UUID', async () => {
    const prisma = {
      event: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const svc = new TeplohodWidgetsService(prisma);
    const uuid = '123e4567-e89b-12d3-a456-426614174000';

    // @ts-expect-error access private for test
    await svc['findEvent'](uuid);

    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: uuid, isActive: true, isDeleted: false },
      }),
    );
  });

  it('queries by Teplohod tcEventId when eventId is numeric', async () => {
    const prisma = {
      event: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const svc = new TeplohodWidgetsService(prisma);

    // @ts-expect-error access private for test
    await svc['findEvent']('12345');

    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          source: 'TEPLOHOD',
          isActive: true,
          isDeleted: false,
          OR: [{ tcEventId: '12345' }, { tcEventId: 'tep-12345' }],
        },
      }),
    );
  });

  it('normalizes legacy tep-123 format for lookup', async () => {
    const prisma = {
      event: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const svc = new TeplohodWidgetsService(prisma);

    // @ts-expect-error access private for test
    await svc['findEvent']('tep-999');

    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          source: 'TEPLOHOD',
          isActive: true,
          isDeleted: false,
          OR: [{ tcEventId: '999' }, { tcEventId: 'tep-999' }],
        },
      }),
    );
  });
});

describe('getPartnerEventId', () => {
  it('returns tcEventId for Teplohod events', () => {
    const id = getPartnerEventId({ source: 'TEPLOHOD', tcEventId: '123', id: 'uuid-1' });
    expect(id).toBe('123');
  });

  it('falls back to UUID for non-Teplohod events', () => {
    const id = getPartnerEventId({ source: 'TC', tcEventId: '6980', id: 'uuid-2' });
    expect(id).toBe('uuid-2');
  });
});

