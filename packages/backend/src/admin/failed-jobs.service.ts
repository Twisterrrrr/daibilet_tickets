import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Job } from 'bullmq';
import {
  QUEUE_EMAILS,
  QUEUE_FULFILLMENT,
  QUEUE_SYNC,
  QUEUE_REVIEW_TASKS,
  QUEUE_PARTNER_WEBHOOKS,
} from '../queue/queue.constants';
import { AuditService } from './audit.service';

export const QUEUE_NAMES = [
  QUEUE_SYNC,
  QUEUE_FULFILLMENT,
  QUEUE_EMAILS,
  QUEUE_REVIEW_TASKS,
  QUEUE_PARTNER_WEBHOOKS,
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

export interface FailedJobDto {
  jobId: string;
  queue: string;
  name: string;
  attemptsMade: number;
  attempts: number;
  failedReason: string;
  stackShort: string | null;
  timestamp: number;
  finishedOn?: number;
}

const STACK_MAX_LINES = 5;

function shortStack(reason: string | undefined): string | null {
  if (!reason || typeof reason !== 'string') return null;
  const lines = reason.split('\n').slice(0, STACK_MAX_LINES);
  return lines.join('\n').slice(0, 500) || null;
}

@Injectable()
export class FailedJobsService {
  private readonly logger = new Logger(FailedJobsService.name);
  private readonly queues: Map<string, Queue>;

  constructor(
    @InjectQueue(QUEUE_SYNC) syncQueue: Queue,
    @InjectQueue(QUEUE_FULFILLMENT) fulfillmentQueue: Queue,
    @InjectQueue(QUEUE_EMAILS) emailQueue: Queue,
    @InjectQueue(QUEUE_REVIEW_TASKS) reviewQueue: Queue,
    @InjectQueue(QUEUE_PARTNER_WEBHOOKS) partnerQueue: Queue,
    private readonly audit: AuditService,
  ) {
    this.queues = new Map([
      [QUEUE_SYNC, syncQueue],
      [QUEUE_FULFILLMENT, fulfillmentQueue],
      [QUEUE_EMAILS, emailQueue],
      [QUEUE_REVIEW_TASKS, reviewQueue],
      [QUEUE_PARTNER_WEBHOOKS, partnerQueue],
    ]);
  }

  private toDto(job: Job, queueName: string): FailedJobDto {
    const opts = job.opts as { attempts?: number };
    return {
      jobId: job.id!,
      queue: queueName,
      name: job.name,
      attemptsMade: job.attemptsMade,
      attempts: opts?.attempts ?? 3,
      failedReason: job.failedReason ?? 'Unknown',
      stackShort: shortStack(job.failedReason),
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
    };
  }

  async getFailedJobs(queueName?: string, start = 0, limit = 50): Promise<{ jobs: FailedJobDto[]; total: number }> {
    const targetQueues = queueName && this.queues.has(queueName)
      ? [queueName]
      : QUEUE_NAMES;

    const results: FailedJobDto[] = [];
    let total = 0;

    for (const qName of targetQueues) {
      const queue = this.queues.get(qName)!;
      const count = await queue.getFailedCount();
      total += count;

      const fetchStart = queueName ? start : 0;
      const fetchLimit = queueName ? limit : Math.ceil(limit / targetQueues.length);
      const end = Math.min(fetchStart + fetchLimit - 1, count - 1);
      if (end < fetchStart) continue;

      const failed = await queue.getFailed(fetchStart, end);
      for (const job of failed) {
        if (results.length >= limit) break;
        results.push(this.toDto(job, qName));
      }
      if (results.length >= limit) break;
    }

    return { jobs: results, total };
  }

  async retryJob(queueName: string, jobId: string, userId: string): Promise<{ retried: boolean }> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new NotFoundException(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found in queue ${queueName}`);
    }

    const state = await job.getState();
    if (state !== 'failed') {
      throw new NotFoundException(`Job ${jobId} is not in failed state (current: ${state})`);
    }

    await job.retry('failed');
    this.logger.log(`Admin retried job ${jobId} in queue ${queueName}`);

    await this.audit.log(userId, 'UPDATE', 'FailedJob', `${queueName}:${jobId}`, undefined, {
      action: 'retry',
      queue: queueName,
      jobId,
    });

    return { retried: true };
  }
}
