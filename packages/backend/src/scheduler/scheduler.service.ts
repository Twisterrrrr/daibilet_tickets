import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';

import { FuzzyDedupService } from '../catalog/fuzzy-dedup.service';
import { TcSyncService } from '../catalog/tc-sync.service';
import { QUEUE_SYNC } from '../queue/queue.constants';
import { RetentionService } from './retention.service';

/**
 * Фиксированные jobId для защиты от перекрытия (overlap protection).
 *
 * BullMQ v5+ дедуплицирует job-ы по jobId атомарно на уровне Redis:
 * если job с таким ID в состоянии waiting / active / delayed —
 * queue.add() вернёт существующий job, а не создаст дубликат.
 * Completed / failed НЕ блокируют — новый job создастся.
 */
// BullMQ v5+: jobId (custom id) не может содержать двоеточие.
// Используем безопасный формат с подчёркиваниями для overlap protection.
const SYNC_FULL_JOB_ID = 'singleton_sync_full';
const SYNC_INCREMENTAL_JOB_ID = 'singleton_sync_incremental';

/**
 * Scheduler Service — автоматическая синхронизация данных.
 *
 * Расписание:
 * - Полная синхронизация TC + TEP + retag + smart populate: каждые 6 часов
 * - Инкрементальная синхронизация TC: каждые 30 минут
 * - Дедупликация: раз в сутки (03:00)
 *
 * Защита от перекрытия (overlap protection):
 * 1. jobId dedup — Redis атомарно отклоняет дубликаты (BullMQ v5+)
 * 2. concurrency: 1 на SyncProcessor — не более 1 job одновременно
 * 3. Бизнес-логика: incremental не ставится, если full sync активен
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_SYNC) private readonly syncQueue: Queue,
    private readonly tcSync: TcSyncService,
    private readonly fuzzyDedup: FuzzyDedupService,
    private readonly retention: RetentionService,
  ) {}

  /**
   * Полная синхронизация всех источников.
   * Всё (TC, TEP, retag, combo, cache) обрабатывается в SyncProcessor.
   *
   * jobId dedup: если предыдущий full sync ещё не завершён —
   * Redis атомарно отклонит дубликат, гонки невозможны.
   */
  @Cron('0 0 0,6,12,18 * * *', { name: 'full-sync' })
  async handleFullSync() {
    this.logger.log('=== CRON: Полная синхронизация → queue ===');

    const job = await this.syncQueue.add(
      'sync-full',
      {},
      {
        jobId: SYNC_FULL_JOB_ID,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    );

    if (!job || !job.id) {
      this.logger.warn(
        `sync-full: job "${SYNC_FULL_JOB_ID}" уже в очереди — дублирование предотвращено (Redis jobId dedup)`,
      );
      return;
    }

    this.logger.log(`sync-full: job ${job.id} поставлен в очередь`);
  }

  /**
   * Инкрементальная синхронизация TC.
   * TC sync + cache invalidation обрабатываются в SyncProcessor.
   *
   * Пропускается если:
   * - час полной синхронизации (0, 6, 12, 18) — full sync покрывает TC
   * - full sync активен/ожидает — incremental — подмножество full, бессмысленно
   * - предыдущий incremental ещё не завершён — jobId dedup
   */
  @Cron('0 30 * * * *', { name: 'incremental-tc-sync' })
  async handleIncrementalSync() {
    const hour = new Date().getHours();
    if ([0, 6, 12, 18].includes(hour)) {
      this.logger.debug('Инкрементальная пропущена — час полной синхронизации');
      return;
    }

    // Targeted check: не ставить incremental, пока full sync работает.
    // Это бизнес-правило (incremental ⊂ full), а не защита от гонок.
    const fullSyncJob = await this.syncQueue.getJob(SYNC_FULL_JOB_ID);
    if (fullSyncJob) {
      const state = await fullSyncJob.getState();
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        this.logger.debug(`sync-incremental: full sync в состоянии "${state}" — пропускаем (работа покрыта)`);
        return;
      }
    }

    this.logger.log('=== CRON: Инкрементальная синхронизация TC → queue ===');

    const job = await this.syncQueue.add(
      'sync-incremental',
      {},
      {
        jobId: SYNC_INCREMENTAL_JOB_ID,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    );

    if (!job || !job.id) {
      this.logger.warn(`sync-incremental: job "${SYNC_INCREMENTAL_JOB_ID}" уже в очереди — дублирование предотвращено`);
      return;
    }

    this.logger.log(`sync-incremental: job ${job.id} поставлен в очередь`);
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
      this.logger.log(`Dedup: ${result.groupsProcessed} групп, ${result.duplicatesRemoved} дублей удалено`);
    } catch (err: unknown) {
      this.logger.error(`Дедупликация — ошибка: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Fuzzy dedup — dry-run only (logging candidates, no merge)
    try {
      const fuzzyResult = await this.fuzzyDedup.findDuplicates(true);
      this.logger.log(`Fuzzy dedup (dry-run): ${fuzzyResult.candidates.length} candidates found`);
    } catch (err: unknown) {
      this.logger.error(`Fuzzy dedup — ошибка: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * E1 — Retention cleanup: EventSession, ProcessedWebhookEvent, AuditLog.
   * Раз в сутки в 04:00. Dry-run через RETENTION_DRY_RUN=true.
   */
  @Cron('0 0 4 * * *', { name: 'retention-cleanup' })
  async handleRetention() {
    this.logger.log('=== CRON: Retention cleanup ===');

    try {
      const report = await this.retention.run();
      this.logger.log(
        `Retention: sessions ${report.eventSessions.deleted || report.eventSessions.wouldDelete}, ` +
          `webhooks ${report.webhooks.deleted || report.webhooks.wouldDelete}, ` +
          `audit ${report.auditLogs.deleted || report.auditLogs.wouldDelete} (dryRun=${report.dryRun})`,
      );
    } catch (err: unknown) {
      this.logger.error(`Retention — ошибка: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
