import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';

import { QUEUE_ANALYTICS_PREAGG } from '../queue/queue.constants';

const DAILY_PREAGG_JOB_ID_PREFIX = 'analytics_preagg_day';

/**
 * Ежедневная постановка пересчёта pre-aggregation за вчера (UTC) в очередь analytics-preagg.
 */
@Injectable()
export class AnalyticsPreaggSchedulerService {
  private readonly logger = new Logger(AnalyticsPreaggSchedulerService.name);

  constructor(@InjectQueue(QUEUE_ANALYTICS_PREAGG) private readonly analyticsPreaggQueue: Queue) {}

  @Cron('0 20 1 * * *', { name: 'analytics-preagg-daily' })
  async enqueueYesterdayRebuild() {
    const statDate = new Date();
    statDate.setUTCHours(0, 0, 0, 0);
    statDate.setUTCDate(statDate.getUTCDate() - 1);
    const dayKey = statDate.toISOString().slice(0, 10);
    const jobId = `${DAILY_PREAGG_JOB_ID_PREFIX}_${dayKey}`;

    this.logger.log(`=== CRON: analytics preagg → queue (${dayKey}) ===`);

    const job = await this.analyticsPreaggQueue.add(
      'rebuild-daily-event-stats',
      { statDateISO: statDate.toISOString() },
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: 30,
        removeOnFail: 10,
      },
    );

    if (!job || !job.id) {
      this.logger.warn(`analytics-preagg: job "${jobId}" уже в очереди — повтор не создан`);
      return;
    }

    this.logger.log(`analytics-preagg: job ${job.id} поставлен`);
  }
}
