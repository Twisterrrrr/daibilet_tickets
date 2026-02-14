import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_REVIEW_TASKS } from './queue.constants';

export type ReviewTaskData =
  | { type: 'cleanup-expired-tokens' }
  | { type: 'send-review-requests' };

@Processor(QUEUE_REVIEW_TASKS)
export class ReviewTaskProcessor extends WorkerHost {
  private readonly logger = new Logger(ReviewTaskProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ReviewTaskData>): Promise<void> {
    const data = job.data;
    this.logger.debug(`Processing review task: ${data.type} [${job.id}]`);

    switch (data.type) {
      case 'cleanup-expired-tokens':
        await this.cleanupExpiredTokens();
        break;

      case 'send-review-requests':
        // Будет реализовано в Фазе 4
        this.logger.log('send-review-requests: not yet implemented');
        break;

      default:
        this.logger.warn(`Unknown review task type: ${(data as { type: string }).type}`);
    }
  }

  /**
   * Удалить отзывы со статусом PENDING_EMAIL, у которых истёк TTL (48 часов).
   */
  private async cleanupExpiredTokens(): Promise<void> {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const result = await this.prisma.review.deleteMany({
      where: {
        status: 'PENDING_EMAIL',
        createdAt: { lt: cutoff },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired unverified reviews`);
    }
  }
}
