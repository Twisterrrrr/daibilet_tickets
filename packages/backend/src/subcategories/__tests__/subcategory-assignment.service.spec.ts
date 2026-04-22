import { EventCategory } from '@/prisma-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../prisma/prisma.service';
import { MAX_SECONDARY_SUBCATEGORIES_EVENT } from '../subcategory-assignment.constants';
import { SubcategoryAssignmentService } from '../subcategory-assignment.service';

describe('SubcategoryAssignmentService', () => {
  let prisma: {
    event: { findUnique: ReturnType<typeof vi.fn> };
    subcategory: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
    eventSubcategoryLink: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
  };
  let service: SubcategoryAssignmentService;

  beforeEach(() => {
    prisma = {
      event: { findUnique: vi.fn() },
      subcategory: { findFirst: vi.fn(), findMany: vi.fn() },
      eventSubcategoryLink: { deleteMany: vi.fn(), createMany: vi.fn() },
      $transaction: async (fn) => fn(prisma),
    };
    service = new SubcategoryAssignmentService(prisma as unknown as PrismaService);
  });

  it('assign primary only', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'e1',
      category: EventCategory.EXCURSION,
      override: null,
    });
    prisma.subcategory.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.subcategory.findMany.mockResolvedValue([]);
    await service.assignEventSubcategories('e1', 'RIVER', []);
    expect(prisma.eventSubcategoryLink.deleteMany).toHaveBeenCalled();
    expect(prisma.eventSubcategoryLink.createMany).toHaveBeenCalledWith({
      data: [{ eventId: 'e1', subcategoryId: 'p1' }],
      skipDuplicates: true,
    });
  });

  it('assign primary + secondary', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'e1',
      category: EventCategory.EXCURSION,
      override: null,
    });
    prisma.subcategory.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.subcategory.findMany.mockResolvedValue([
      { id: 's1', code: 'NIGHT' },
      { id: 's2', code: 'HISTORY' },
    ]);
    await service.assignEventSubcategories('e1', 'RIVER', ['NIGHT', 'HISTORY']);
    expect(prisma.eventSubcategoryLink.createMany).toHaveBeenCalledWith({
      data: [
        { eventId: 'e1', subcategoryId: 'p1' },
        { eventId: 'e1', subcategoryId: 's1' },
        { eventId: 'e1', subcategoryId: 's2' },
      ],
      skipDuplicates: true,
    });
  });

  it('rejects secondary over event limit', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'e1',
      category: EventCategory.EXCURSION,
      override: null,
    });
    prisma.subcategory.findFirst.mockResolvedValue({ id: 'p1' });
    const tooMany = Array.from({ length: MAX_SECONDARY_SUBCATEGORIES_EVENT + 1 }, (_, i) => `C${i}`);
    await expect(service.assignEventSubcategories('e1', 'RIVER', tooMany)).rejects.toThrow();
  });

  it('rejects wrong primary for category', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'e1',
      category: EventCategory.EXCURSION,
      override: null,
    });
    await expect(service.assignEventSubcategories('e1', 'CONCERT', [])).rejects.toThrow();
  });
});
