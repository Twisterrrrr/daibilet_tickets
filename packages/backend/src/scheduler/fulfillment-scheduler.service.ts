/**
 * Fulfillment Scheduler — cron задачи для исполнения заказов.
 *
 * Задачи:
 * - Каждые 2 мин: retry PENDING fulfillment items с прошедшим nextRetryAt
 * - Каждую 1 мин: auto-compensate FAILED items после 15-мин окна
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_FULFILLMENT } from '../queue/queue.constants';

@Injectable()
export class FulfillmentSchedulerService {
  private readonly logger = new Logger(FulfillmentSchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_FULFILLMENT) private readonly fulfillmentQueue: Queue,
  ) {}

  /**
   * Retry pending fulfillment items (every 2 minutes).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async retryPendingItems() {
    try {
      await this.fulfillmentQueue.add('fulfillment-retry', {}, {
        removeOnComplete: 50,
        removeOnFail: 20,
      });
    } catch (error) {
      this.logger.error(`Fulfillment retry cron failed: ${(error as Error).message}`);
    }
  }

  /**
   * Auto-compensate escalated FAILED items (every minute).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoCompensate() {
    try {
      await this.fulfillmentQueue.add('auto-compensate', {}, {
        removeOnComplete: 50,
        removeOnFail: 20,
      });
    } catch (error) {
      this.logger.error(`Auto-compensate cron failed: ${(error as Error).message}`);
    }
  }
}
