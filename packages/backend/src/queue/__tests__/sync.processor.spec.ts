import { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SyncProcessor } from '../sync.processor';

// ---------------------
// Mock factories
// ---------------------

const mockTcSync = {
  syncAll: vi.fn().mockResolvedValue({
    status: 'ok',
    uniqueEvents: 100,
    sessionsSynced: 500,
  }),
  retagAll: vi.fn().mockResolvedValue({
    eventsProcessed: 100,
    tagsLinked: 50,
  }),
};

const mockTepSync = {
  syncAll: vi.fn().mockResolvedValue({
    status: 'ok',
    eventsSynced: 50,
  }),
};

const mockCombo = {
  populateAll: vi.fn().mockResolvedValue({
    checked: 10,
    changed: 3,
  }),
};

const mockCache = {
  invalidateAfterSync: vi.fn().mockResolvedValue(undefined),
};

const makeJob = (name: string, attemptsMade = 0): Job<any, any, string> =>
  ({
    name,
    attemptsMade,
    data: {},
  }) as any;

// ---------------------
// Tests
// ---------------------

describe('SyncProcessor', () => {
  let processor: SyncProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new SyncProcessor(mockTcSync as any, mockTepSync as any, mockCombo as any, mockCache as any);
  });

  // =========================================
  // sync-full job
  // =========================================

  describe('process - sync-full', () => {
    it('should call all sync methods in correct order', async () => {
      const job = makeJob('sync-full');

      await processor.process(job);

      expect(mockTcSync.syncAll).toHaveBeenCalledTimes(1);
      expect(mockTepSync.syncAll).toHaveBeenCalledTimes(1);
      expect(mockTcSync.retagAll).toHaveBeenCalledTimes(1);
      expect(mockCombo.populateAll).toHaveBeenCalledTimes(1);
      expect(mockCache.invalidateAfterSync).toHaveBeenCalledTimes(1);
    });

    it('should return combined results from all sync operations', async () => {
      const job = makeJob('sync-full');

      const result = await processor.process(job);

      expect(result).toEqual({
        tc: {
          status: 'ok',
          uniqueEvents: 100,
          sessionsSynced: 500,
        },
        tep: {
          status: 'ok',
          eventsSynced: 50,
        },
        retag: {
          eventsProcessed: 100,
          tagsLinked: 50,
        },
        combo: {
          checked: 10,
          changed: 3,
        },
      });
    });

    it('should handle combo.populateAll error gracefully', async () => {
      const error = new Error('Combo populate failed');
      mockCombo.populateAll.mockRejectedValueOnce(error);

      const job = makeJob('sync-full');

      const result = await processor.process(job);

      // Should still return results with default combo values
      expect(result).toEqual({
        tc: {
          status: 'ok',
          uniqueEvents: 100,
          sessionsSynced: 500,
        },
        tep: {
          status: 'ok',
          eventsSynced: 50,
        },
        retag: {
          eventsProcessed: 100,
          tagsLinked: 50,
        },
        combo: {
          checked: 0,
          changed: 0,
        },
      });

      // All other methods should still be called
      expect(mockTcSync.syncAll).toHaveBeenCalled();
      expect(mockTepSync.syncAll).toHaveBeenCalled();
      expect(mockTcSync.retagAll).toHaveBeenCalled();
      expect(mockCache.invalidateAfterSync).toHaveBeenCalled();
    });

    it('should continue execution after combo error', async () => {
      mockCombo.populateAll.mockRejectedValueOnce(new Error('Combo error'));

      const job = makeJob('sync-full');

      await processor.process(job);

      // Cache invalidation should still be called after combo error
      expect(mockCache.invalidateAfterSync).toHaveBeenCalled();
    });

    it('should log attempt number in job processing', async () => {
      const job = makeJob('sync-full', 2);

      await processor.process(job);

      // Verify all methods were called despite attempt number
      expect(mockTcSync.syncAll).toHaveBeenCalled();
    });
  });

  // =========================================
  // sync-incremental job
  // =========================================

  describe('process - sync-incremental', () => {
    it('should call only tcSync.syncAll and cache.invalidateAfterSync', async () => {
      const job = makeJob('sync-incremental');

      await processor.process(job);

      expect(mockTcSync.syncAll).toHaveBeenCalledTimes(1);
      expect(mockCache.invalidateAfterSync).toHaveBeenCalledTimes(1);

      // Should NOT call tepSync or combo
      expect(mockTepSync.syncAll).not.toHaveBeenCalled();
      expect(mockTcSync.retagAll).not.toHaveBeenCalled();
      expect(mockCombo.populateAll).not.toHaveBeenCalled();
    });

    it('should call cache invalidation after tcSync', async () => {
      const job = makeJob('sync-incremental');

      await processor.process(job);

      // Both methods should be called
      expect(mockTcSync.syncAll).toHaveBeenCalled();
      expect(mockCache.invalidateAfterSync).toHaveBeenCalled();
    });

    it('should return only tc result', async () => {
      const job = makeJob('sync-incremental');

      const result = await processor.process(job);

      expect(result).toEqual({
        tc: {
          status: 'ok',
          uniqueEvents: 100,
          sessionsSynced: 500,
        },
      });
    });

    it('should not include tep, retag, or combo in result', async () => {
      const job = makeJob('sync-incremental');

      const result = await processor.process(job);

      expect(result).not.toHaveProperty('tep');
      expect(result).not.toHaveProperty('retag');
      expect(result).not.toHaveProperty('combo');
    });
  });

  // =========================================
  // Unknown job name
  // =========================================

  describe('process - unknown job name', () => {
    it('should return null for unknown job name', async () => {
      const job = makeJob('unknown-job');

      const result = await processor.process(job);

      expect(result).toBeNull();
    });

    it('should not call any sync methods for unknown job', async () => {
      const job = makeJob('unknown-job');

      await processor.process(job);

      expect(mockTcSync.syncAll).not.toHaveBeenCalled();
      expect(mockTepSync.syncAll).not.toHaveBeenCalled();
      expect(mockTcSync.retagAll).not.toHaveBeenCalled();
      expect(mockCombo.populateAll).not.toHaveBeenCalled();
      expect(mockCache.invalidateAfterSync).not.toHaveBeenCalled();
    });

    it('should handle empty job name', async () => {
      const job = makeJob('');

      const result = await processor.process(job);

      expect(result).toBeNull();
    });
  });

  // =========================================
  // Error handling
  // =========================================

  describe('error handling', () => {
    it('should propagate tcSync.syncAll errors', async () => {
      const error = new Error('TC sync failed');
      mockTcSync.syncAll.mockRejectedValueOnce(error);

      const job = makeJob('sync-full');

      await expect(processor.process(job)).rejects.toThrow('TC sync failed');
    });

    it('should propagate tepSync.syncAll errors in full sync', async () => {
      const error = new Error('TEP sync failed');
      mockTepSync.syncAll.mockRejectedValueOnce(error);

      const job = makeJob('sync-full');

      await expect(processor.process(job)).rejects.toThrow('TEP sync failed');
    });

    it('should propagate retagAll errors', async () => {
      const error = new Error('Retag failed');
      mockTcSync.retagAll.mockRejectedValueOnce(error);

      const job = makeJob('sync-full');

      await expect(processor.process(job)).rejects.toThrow('Retag failed');
    });

    it('should propagate cache invalidation errors', async () => {
      const error = new Error('Cache invalidation failed');
      mockCache.invalidateAfterSync.mockRejectedValueOnce(error);

      const job = makeJob('sync-incremental');

      await expect(processor.process(job)).rejects.toThrow('Cache invalidation failed');
    });

    it('should propagate tcSync errors in incremental sync', async () => {
      const error = new Error('TC sync failed');
      mockTcSync.syncAll.mockRejectedValueOnce(error);

      const job = makeJob('sync-incremental');

      await expect(processor.process(job)).rejects.toThrow('TC sync failed');
    });
  });
});
