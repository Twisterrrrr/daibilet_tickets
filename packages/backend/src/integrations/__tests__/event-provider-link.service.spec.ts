import { TicketProviderCode, ProviderLinkStatus, ProviderSyncMode } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { EventProviderLinkService } from '../event-provider-link.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('EventProviderLinkService', () => {
  it('clears other primary flags when creating primary link', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const create = vi.fn().mockResolvedValue({ id: 'link-1' });
    const tx = { eventProviderLink: { updateMany, create } };
    const $transaction = vi.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
    const prisma = { $transaction } as unknown as PrismaService;
    const svc = new EventProviderLinkService(prisma);

    await svc.createLinkWithPrimaryGuard({
      eventId: 'evt-1',
      provider: TicketProviderCode.RADARIO,
      externalEventId: 'ext-1',
      isPrimary: true,
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { eventId: 'evt-1' },
      data: { isPrimary: false },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: 'evt-1',
        provider: TicketProviderCode.RADARIO,
        externalEventId: 'ext-1',
        isPrimary: true,
        syncMode: ProviderSyncMode.PULL,
        status: ProviderLinkStatus.ACTIVE,
      }),
    });
  });
});
