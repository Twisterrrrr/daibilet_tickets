import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUE_ANALYTICS_PREAGG } from '../queue/queue.constants';
import { AnalyticsService } from './analytics.service';

export type AnalyticsPreaggJobData = {
  /** ISO-дата начала календарного дня UTC для пересчёта; по умолчанию — вчера UTC. */
  statDateISO?: string;
};

function utcYesterdayStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

@Processor(QUEUE_ANALYTICS_PREAGG, { concurrency: 1, lockDuration: 300_000 })
export class AnalyticsPreaggProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsPreaggProcessor.name);

  constructor(private readonly analytics: AnalyticsService) {
    super();
  }

  async process(job: Job<AnalyticsPreaggJobData>): Promise<{ rows: number }> {
    const statDate = job.data?.statDateISO ? new Date(job.data.statDateISO) : utcYesterdayStart();
    this.logger.log(`analytics-preagg: rebuild statDate=${statDate.toISOString().slice(0, 10)} job=${job.id}`);
    const result = await this.analytics.rebuildDailyEventStatsForDate(statDate);
    this.logger.log(`analytics-preagg: done rows=${result.rows}`);
    return result;
  }
}
