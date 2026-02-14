import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TcSyncService } from '../catalog/tc-sync.service';
import { FuzzyDedupService } from '../catalog/fuzzy-dedup.service';
import { QUEUE_SYNC } from '../queue/queue.constants';

/**
 * Scheduler Service — автоматическая синхронизация данных.
 *
 * Расписание:
 * - Полная синхронизация TC + TEP + retag + smart populate: каждые 6 часов
 * - Инкрементальная синхронизация TC: каждые 30 минут
 * - Дедупликация: раз в сутки (03:00)
 *
 * Синхронизация теперь выполняется через BullMQ (QUEUE_SYNC).
 * SyncProcessor обрабатывает: sync, retag, combo populate, cache invalidation.
 * Cron-хендлеры только ставят задачу в очередь.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_SYNC) private readonly syncQueue: Queue,
    private readonly tcSync: TcSyncService,
    private readonly fuzzyDedup: FuzzyDedupService,
  ) {}

  /**
   * Полная синхронизация всех источников.
   * Всё (TC, TEP, retag, combo, cache) обрабатывается в SyncProcessor.
   */
  @Cron('0 0 0,6,12,18 * * *', { name: 'full-sync' })
  async handleFullSync() {
    const activeCount = await this.syncQueue.getActiveCount();
    const waitingCount = await this.syncQueue.getWaitingCount();

    if (activeCount > 0 || waitingCount > 0) {
      this.logger.warn(
        `Полная синхронизация пропущена — в очереди: active=${activeCount}, waiting=${waitingCount}`,
      );
      return;
    }

    this.logger.log('=== CRON: Полная синхронизация → queue ===');

    await this.syncQueue.add('sync-full', {}, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  /**
   * Инкрементальная синхронизация TC.
   * TC sync + cache invalidation обрабатываются в SyncProcessor.
   */
  @Cron('0 30 * * * *', { name: 'incremental-tc-sync' })
  async handleIncrementalSync() {
    const hour = new Date().getHours();
    if ([0, 6, 12, 18].includes(hour)) {
      this.logger.debug('Инкрементальная пропущена — час полной синхронизации');
      return;
    }

    const activeCount = await this.syncQueue.getActiveCount();
    if (activeCount > 0) {
      this.logger.debug('Инкрементальная синхронизация пропущена — очередь занята');
      return;
    }

    this.logger.log('=== CRON: Инкрементальная синхронизация TC → queue ===');

    await this.syncQueue.add('sync-incremental', {}, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  /**
   * Дедупликация — раз в сутки в 03:00.
   * Остаётся прямым вызовом (быстрая операция, не нужна очередь).
   */
  @Cron('0 0 3 * * *', { name: 'daily-dedup' })
  async handleDailyDedup() {
    this.logger.log('=== CRON: Дедупликация ===');

    try {
      const result = await this.tcSync.deduplicateExisting();
      this.logger.log(
        `Dedup: ${result.groupsProcessed} групп, ${result.duplicatesRemoved} дублей удалено`,
      );
    } catch (err: unknown) {
      this.logger.error(`Дедупликация — ошибка: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Fuzzy dedup — dry-run only (logging candidates, no merge)
    try {
      const fuzzyResult = await this.fuzzyDedup.findDuplicates(true);
      this.logger.log(
        `Fuzzy dedup (dry-run): ${fuzzyResult.candidates.length} candidates found`,
      );
    } catch (err: unknown) {
      this.logger.error(`Fuzzy dedup — ошибка: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
