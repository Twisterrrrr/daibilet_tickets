import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditService } from '../audit.service';
import { FailedJobsService } from '../failed-jobs.service';

const createMockQueue = (
  failedJobs: Array<{
    id: string;
    name: string;
    attemptsMade: number;
    failedReason: string;
    timestamp: number;
    opts: { attempts?: number };
    finishedOn?: number;
  }>,
) => {
  const retryFn = vi.fn().mockResolvedValue(undefined);
  const getFailed = vi
    .fn()
    .mockResolvedValue(failedJobs.map((j) => ({ ...j, retry: retryFn, getState: () => 'failed' })));
  const getFailedCount = vi.fn().mockResolvedValue(failedJobs.length);
  const getJob = vi.fn().mockImplementation((id: string) => {
    const j = failedJobs.find((x) => x.id === id);
    if (!j) return null;
    return { ...j, retry: retryFn, getState: () => 'failed' };
  });
  return { getFailed, getFailedCount, getJob, retryFn };
};

describe('FailedJobsService', () => {
  let service: FailedJobsService;
  let mockQueues: Map<string, ReturnType<typeof createMockQueue>>;
  let auditLog: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const baseJob = {
      id: 'job-1',
      name: 'sync-full',
      attemptsMade: 3,
      failedReason: 'TC sync failed',
      timestamp: Date.now(),
      opts: { attempts: 5 },
      finishedOn: Date.now(),
      getState: () => 'failed',
    };

    const syncQueue = createMockQueue([baseJob]);
    const fulfillmentQueue = createMockQueue([]);
    const emailQueue = createMockQueue([]);
    const reviewQueue = createMockQueue([]);
    const partnerQueue = createMockQueue([]);

    mockQueues = new Map([
      ['sync', syncQueue],
      ['fulfillment', fulfillmentQueue],
      ['emails', emailQueue],
      ['review-tasks', reviewQueue],
      ['partner-webhooks', partnerQueue],
    ]);

    auditLog = vi.fn().mockResolvedValue(undefined);

    service = new FailedJobsService(
      syncQueue as any,
      fulfillmentQueue as any,
      emailQueue as any,
      reviewQueue as any,
      partnerQueue as any,
      { log: auditLog } as unknown as AuditService,
    );
  });

  it('returns failed jobs from all queues', async () => {
    const result = await service.getFailedJobs();
    expect(result.jobs.length).toBeGreaterThanOrEqual(1);
    expect(result.total).toBe(1);
    const j = result.jobs[0];
    expect(j.jobId).toBe('job-1');
    expect(j.queue).toBe('sync');
    expect(j.name).toBe('sync-full');
    expect(j.failedReason).toBe('TC sync failed');
    expect(j.attemptsMade).toBe(3);
    expect(j.attempts).toBe(5);
  });

  it('filters by queue when provided', async () => {
    const result = await service.getFailedJobs('sync');
    expect(result.jobs.every((j) => j.queue === 'sync')).toBe(true);
  });

  it('retries job and logs audit', async () => {
    const syncQueue = mockQueues.get('sync')!;
    const r = await service.retryJob('sync', 'job-1', 'user-123');
    expect(r.retried).toBe(true);
    expect(syncQueue.retryFn).toHaveBeenCalledWith('failed');
    expect(auditLog).toHaveBeenCalledWith(
      'user-123',
      'UPDATE',
      'FailedJob',
      'sync:job-1',
      undefined,
      expect.objectContaining({ action: 'retry', queue: 'sync', jobId: 'job-1' }),
    );
  });
});
