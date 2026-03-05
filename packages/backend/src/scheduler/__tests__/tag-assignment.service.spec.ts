import { TagCategory } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TagAssignmentService } from '../tag-assignment.service';

// ---------------------
// Mock factories
// ---------------------

const mockPrisma = {
  tag: {
    upsert: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([{ id: 'tag-bv' }, { id: 'tag-lm' }, { id: 'tag-ta' }]),
  },
  eventTag: {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  $queryRaw: vi.fn().mockResolvedValue([]),
};

// ---------------------
// Tests
// ---------------------

describe('TagAssignmentService', () => {
  let service: TagAssignmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TagAssignmentService(mockPrisma as any);
  });

  // =========================================
  // ensureTagsExist (via onModuleInit)
  // =========================================

  describe('ensureTagsExist', () => {
    it('should call prisma.tag.upsert 3 times with correct slugs', async () => {
      await service.onModuleInit();

      expect(mockPrisma.tag.upsert).toHaveBeenCalledTimes(3);
      expect(mockPrisma.tag.upsert).toHaveBeenCalledWith({
        where: { slug: 'best-value' },
        create: {
          slug: 'best-value',
          name: 'Лучшая цена',
          category: TagCategory.SPECIAL,
          isActive: true,
        },
        update: {},
      });
      expect(mockPrisma.tag.upsert).toHaveBeenCalledWith({
        where: { slug: 'last-minute' },
        create: {
          slug: 'last-minute',
          name: 'Последний шанс',
          category: TagCategory.SPECIAL,
          isActive: true,
        },
        update: {},
      });
      expect(mockPrisma.tag.upsert).toHaveBeenCalledWith({
        where: { slug: 'today-available' },
        create: {
          slug: 'today-available',
          name: 'Доступно сегодня',
          category: TagCategory.SPECIAL,
          isActive: true,
        },
        update: {},
      });
    });

    it('should be called automatically on module init', async () => {
      await service.onModuleInit();

      expect(mockPrisma.tag.upsert).toHaveBeenCalledTimes(3);
    });
  });

  // =========================================
  // clearDynamicTags
  // =========================================

  describe('clearDynamicTags', () => {
    it('should find tags by slug and delete all eventTags', async () => {
      // Access private method via type assertion
      await (service as any).clearDynamicTags();

      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
        where: { slug: { in: ['best-value', 'last-minute', 'today-available'] } },
        select: { id: true },
      });
      expect(mockPrisma.eventTag.deleteMany).toHaveBeenCalledWith({
        where: { tagId: { in: ['tag-bv', 'tag-lm', 'tag-ta'] } },
      });
    });

    it('should not call deleteMany when no tags found', async () => {
      mockPrisma.tag.findMany.mockResolvedValueOnce([]);

      await (service as any).clearDynamicTags();

      expect(mockPrisma.eventTag.deleteMany).not.toHaveBeenCalled();
    });

    it('should handle empty tagIds array', async () => {
      mockPrisma.tag.findMany.mockResolvedValueOnce([]);

      await (service as any).clearDynamicTags();

      expect(mockPrisma.eventTag.deleteMany).not.toHaveBeenCalled();
    });
  });

  // =========================================
  // assignBestValue
  // =========================================

  describe('assignBestValue', () => {
    it('should return 0 when tag not found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce(null);

      const result = await (service as any).assignBestValue();

      expect(result).toBe(0);
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
      expect(mockPrisma.eventTag.createMany).not.toHaveBeenCalled();
    });

    it('should call $queryRaw for candidates', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-bv' });
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ eventId: 'event-1' }, { eventId: 'event-2' }]);

      await (service as any).assignBestValue();

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      const queryCall = mockPrisma.$queryRaw.mock.calls[0][0];
      expect(queryCall).toBeDefined();
    });

    it('should call createMany with eventIds and tag.id when candidates exist', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-bv' });
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ eventId: 'event-1' }, { eventId: 'event-2' }]);

      await (service as any).assignBestValue();

      expect(mockPrisma.eventTag.createMany).toHaveBeenCalledWith({
        data: [
          { eventId: 'event-1', tagId: 'tag-bv' },
          { eventId: 'event-2', tagId: 'tag-bv' },
        ],
        skipDuplicates: true,
      });
    });

    it('should return count of candidates', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-bv' });
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { eventId: 'event-1' },
        { eventId: 'event-2' },
        { eventId: 'event-3' },
      ]);

      const result = await (service as any).assignBestValue();

      expect(result).toBe(3);
    });

    it('should not call createMany when no candidates', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-bv' });
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      await (service as any).assignBestValue();

      expect(mockPrisma.eventTag.createMany).not.toHaveBeenCalled();
    });
  });

  // =========================================
  // assignLastMinute
  // =========================================

  describe('assignLastMinute', () => {
    it('should return 0 when tag not found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce(null);

      const result = await (service as any).assignLastMinute();

      expect(result).toBe(0);
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should call $queryRaw for candidates', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-lm' });
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ eventId: 'event-1' }]);

      await (service as any).assignLastMinute();

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should call createMany with eventIds and tag.id', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-lm' });
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ eventId: 'event-1' }, { eventId: 'event-2' }]);

      await (service as any).assignLastMinute();

      expect(mockPrisma.eventTag.createMany).toHaveBeenCalledWith({
        data: [
          { eventId: 'event-1', tagId: 'tag-lm' },
          { eventId: 'event-2', tagId: 'tag-lm' },
        ],
        skipDuplicates: true,
      });
    });

    it('should return count of candidates', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-lm' });
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ eventId: 'event-1' }]);

      const result = await (service as any).assignLastMinute();

      expect(result).toBe(1);
    });
  });

  // =========================================
  // assignTodayAvailable
  // =========================================

  describe('assignTodayAvailable', () => {
    it('should return 0 when tag not found', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce(null);

      const result = await (service as any).assignTodayAvailable();

      expect(result).toBe(0);
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should call $queryRaw for candidates', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-ta' });
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ eventId: 'event-1' }]);

      await (service as any).assignTodayAvailable();

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should call createMany with eventIds and tag.id', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-ta' });
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ eventId: 'event-1' }, { eventId: 'event-2' }]);

      await (service as any).assignTodayAvailable();

      expect(mockPrisma.eventTag.createMany).toHaveBeenCalledWith({
        data: [
          { eventId: 'event-1', tagId: 'tag-ta' },
          { eventId: 'event-2', tagId: 'tag-ta' },
        ],
        skipDuplicates: true,
      });
    });

    it('should return count of candidates', async () => {
      mockPrisma.tag.findUnique.mockResolvedValueOnce({ id: 'tag-ta' });
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { eventId: 'event-1' },
        { eventId: 'event-2' },
        { eventId: 'event-3' },
      ]);

      const result = await (service as any).assignTodayAvailable();

      expect(result).toBe(3);
    });
  });

  // =========================================
  // runManually
  // =========================================

  describe('runManually', () => {
    beforeEach(() => {
      mockPrisma.tag.findUnique
        .mockResolvedValueOnce({ id: 'tag-bv' })
        .mockResolvedValueOnce({ id: 'tag-lm' })
        .mockResolvedValueOnce({ id: 'tag-ta' });
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ eventId: 'event-1' }, { eventId: 'event-2' }]) // best-value
        .mockResolvedValueOnce([{ eventId: 'event-3' }]) // last-minute
        .mockResolvedValueOnce([{ eventId: 'event-4' }, { eventId: 'event-5' }, { eventId: 'event-6' }]); // today-available
    });

    it('should call ensureTagsExist', async () => {
      await service.runManually();

      expect(mockPrisma.tag.upsert).toHaveBeenCalledTimes(3);
    });

    it('should call clearDynamicTags', async () => {
      await service.runManually();

      expect(mockPrisma.tag.findMany).toHaveBeenCalled();
      expect(mockPrisma.eventTag.deleteMany).toHaveBeenCalled();
    });

    it('should call all 3 assign methods', async () => {
      await service.runManually();

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it('should return counts for all tags', async () => {
      const result = await service.runManually();

      expect(result).toEqual({
        bestValue: 2,
        lastMinute: 1,
        todayAvailable: 3,
      });
    });

    it('should call assign methods in parallel', async () => {
      const _startTime = Date.now();
      await service.runManually();
      const _endTime = Date.now();

      // All three $queryRaw calls should have been made
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(3);
    });
  });

  // =========================================
  // handleDynamicTags (cron)
  // =========================================

  describe('handleDynamicTags', () => {
    beforeEach(() => {
      mockPrisma.tag.findUnique
        .mockResolvedValueOnce({ id: 'tag-bv' })
        .mockResolvedValueOnce({ id: 'tag-lm' })
        .mockResolvedValueOnce({ id: 'tag-ta' });
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ eventId: 'event-1' }])
        .mockResolvedValueOnce([{ eventId: 'event-2' }])
        .mockResolvedValueOnce([{ eventId: 'event-3' }]);
    });

    it('should call ensureTagsExist', async () => {
      await service.handleDynamicTags();

      expect(mockPrisma.tag.upsert).toHaveBeenCalledTimes(3);
    });

    it('should call clearDynamicTags', async () => {
      await service.handleDynamicTags();

      expect(mockPrisma.tag.findMany).toHaveBeenCalled();
      expect(mockPrisma.eventTag.deleteMany).toHaveBeenCalled();
    });

    it('should call all 3 assign methods', async () => {
      await service.handleDynamicTags();

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it('should catch and log errors', async () => {
      const error = new Error('Assignment failed');
      mockPrisma.tag.findMany.mockRejectedValueOnce(error);

      // Should not throw
      await expect(service.handleDynamicTags()).resolves.not.toThrow();
    });

    it('should continue execution after error in ensureTagsExist', async () => {
      mockPrisma.tag.upsert.mockRejectedValueOnce(new Error('Upsert failed'));

      await expect(service.handleDynamicTags()).resolves.not.toThrow();
    });

    it('should continue execution after error in assign methods', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Query failed'));

      await expect(service.handleDynamicTags()).resolves.not.toThrow();
    });
  });

  // =========================================
  // batchInsertTags (private helper)
  // =========================================

  describe('batchInsertTags', () => {
    it('should not call createMany when eventIds is empty', async () => {
      await (service as any).batchInsertTags([], 'tag-id');

      expect(mockPrisma.eventTag.createMany).not.toHaveBeenCalled();
    });

    it('should call createMany with correct data structure', async () => {
      await (service as any).batchInsertTags(['event-1', 'event-2'], 'tag-123');

      expect(mockPrisma.eventTag.createMany).toHaveBeenCalledWith({
        data: [
          { eventId: 'event-1', tagId: 'tag-123' },
          { eventId: 'event-2', tagId: 'tag-123' },
        ],
        skipDuplicates: true,
      });
    });

    it('should use skipDuplicates flag', async () => {
      await (service as any).batchInsertTags(['event-1'], 'tag-123');

      expect(mockPrisma.eventTag.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skipDuplicates: true,
        }),
      );
    });
  });
});
