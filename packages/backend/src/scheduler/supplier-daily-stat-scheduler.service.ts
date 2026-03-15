import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { SupplierDailyStatService } from '../supplier/supplier-daily-stat.service';

/**
 * Раз в сутки в 00:05 UTC агрегируем данные за вчера из PaymentIntent в витрину SupplierDailyStat.
 * Границы суток — явно UTC (вчера 00:00:00 — сегодня 00:00:00 UTC), timezone-safe.
 */
@Injectable()
export class SupplierDailyStatSchedulerService {
  private readonly logger = new Logger(SupplierDailyStatSchedulerService.name);

  constructor(private readonly dailyStat: SupplierDailyStatService) {}

  @Cron('5 0 * * *', { name: 'supplier-daily-stat-aggregate' })
  async aggregateYesterday() {
    this.logger.log('=== CRON: Агрегация витрины SupplierDailyStat за вчера ===');

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    try {
      const { upserted } = await this.dailyStat.aggregateForDate(yesterday);
      this.logger.log(`SupplierDailyStat: обновлено строк за ${yesterday.toISOString().slice(0, 10)}: ${upserted}`);
    } catch (e) {
      this.logger.error(`SupplierDailyStat aggregate failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
