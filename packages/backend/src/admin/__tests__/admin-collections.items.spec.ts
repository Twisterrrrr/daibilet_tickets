import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { AdminCollectionsController } from '../admin-collections.controller';

function makeController(prisma: any) {
  return new AdminCollectionsController(
    prisma,
    {} as any, // suggestionService
    {
      resolveSelection: vi.fn().mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        totalPages: 0,
        preview: { generatedAt: new Date(), eventCount: 0, weights: {} },
      }),
    } as any, // selectionService
    {} as any, // materializer
  );
}

describe('AdminCollectionsController items', () => {
  it('addItem: throws EVENT_NOT_FOUND', async () => {
    const prisma = {
      event: { findUnique: vi.fn().mockResolvedValue(null) },
      collection: { findUnique: vi.fn() },
      collectionItem: { findFirst: vi.fn() },
    };
    const c = makeController(prisma);
    await expect(c.addItem('c1', { eventId: 'e1' })).rejects.toThrow(BadRequestException);
  });

  it('addItem: throws COLLECTION_NOT_FOUND', async () => {
    const prisma = {
      event: { findUnique: vi.fn().mockResolvedValue({ id: 'e1' }) },
      collection: { findUnique: vi.fn().mockResolvedValue(null) },
      collectionItem: { findFirst: vi.fn() },
    };
    const c = makeController(prisma);
    await expect(c.addItem('c1', { eventId: 'e1' })).rejects.toThrow(NotFoundException);
  });

  it('addItem: throws COLLECTION_ITEM_ALREADY_EXISTS', async () => {
    const prisma = {
      event: { findUnique: vi.fn().mockResolvedValue({ id: 'e1' }) },
      collection: { findUnique: vi.fn().mockResolvedValue({ id: 'c1', pinnedEventIds: [], isDeleted: false }) },
      collectionItem: { findFirst: vi.fn().mockResolvedValue({ id: 'it1' }) },
    };
    const c = makeController(prisma);
    await expect(c.addItem('c1', { eventId: 'e1' })).rejects.toThrow(BadRequestException);
  });

  it('reorderItems: rejects invalid ids list', async () => {
    const prisma = {
      collectionItem: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'i1', eventId: 'e1' },
          { id: 'i2', eventId: 'e2' },
        ]),
      },
    };
    const c = makeController(prisma);
    await expect(c.reorderItems('c1', { itemIdsInOrder: ['i1'] })).rejects.toThrow(BadRequestException);
    await expect(c.reorderItems('c1', { itemIdsInOrder: ['i1', 'zzz'] })).rejects.toThrow(BadRequestException);
  });
});

