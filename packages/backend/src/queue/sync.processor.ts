import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TcSyncService } from '../catalog/tc-sync.service';
import { TepSyncService } from '../catalog/tep-sync.service';
import { ComboService } from '../combo/combo.service';
import { CacheService } from '../cache/cache.service';
import { QUEUE_SYNC } from './queue.constants';

export type SyncJobData = Record<string, never>;

/**
 * Hard timeout для sync-задач (защита от зависания).
 *
 * lockDuration (10 мин) спасает от ложного stalled, но не от job,
 * который завис навсегда (бесконечный HTTP, deadlock, утечка).
 * Hard timeout гарантирует, что job перейдёт в failed → BullMQ retry.
 *
 * Full sync: TC + TEP + retag + combo + cache → нормально 10–30 мин, лимит 90 мин.
 * Incremental: только TC + cache → нормально 2–10 мин, лимит 30 мин.
 */
const FULL_SYNC_TIMEOUT_MS = 90 * 60_000;      // 90 минут
const INCREMENTAL_TIMEOUT_MS = 30 * 60_000;     // 30 минут

/**
 * SyncProcessor — обработчик задач синхронизации.
 *
 * concurrency: 1 — гарантирует, что только один sync job выполняется одновременно.
 * lockDuration: 600_000 (10 мин) — предотвращает ложный stalled-статус
 *   для долгих full sync (авто-продление lock каждые lockDuration/2).
 *   Если worker реально завис — job перейдёт в stalled через 10 мин.
 */
@Processor(QUEUE_SYNC, {
  concurrency: 1,
  lockDuration: 600_000,
})
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    private readonly tcSync: TcSyncService,
    private readonly tepSync: TepSyncService,
    private readonly combo: ComboService,
    private readonly cache: CacheService,
  ) {
    super();
  }

  async process(job: Job<SyncJobData, any, string>): Promise<any> {
    const startMs = Date.now();
    this.logger.log(
      `[sync] Processing job: ${job.name} (id=${job.id}, attempt ${job.attemptsMade + 1}/${job.opts.attempts ?? '?'})`,
    );

    try {
      switch (job.name) {
        case 'sync-full':
          return await this.withTimeout(
            () => this.handleFullSync(),
            FULL_SYNC_TIMEOUT_MS,
            job,
          );

        case 'sync-incremental':
          return await this.withTimeout(
            () => this.handleIncrementalSync(),
            INCREMENTAL_TIMEOUT_MS,
            job,
          );

        default:
          this.logger.warn(`[sync] Unknown job name: ${job.name}`);
          return null;
      }
    } finally {
      const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
      this.logger.log(`[sync] Job ${job.name} (id=${job.id}) finished in ${elapsedSec}s`);
    }
  }

  // ─── Hard timeout ──────────────────────────────────────────────────

  /**
   * Обёртка с hard timeout.
   *
   * При превышении лимита:
   * 1. Логируем ERROR (виден в мониторинге)
   * 2. Кидаем Error → BullMQ переводит job в failed
   * 3. Если остались attempts — BullMQ retry с exponential backoff
   * 4. Если attempts исчерпаны — job в failed, следующий cron-тик создаст новый
   *
   * Примечание: реальная async-работа (HTTP к TC/TEP) продолжится в фоне
   * до естественного завершения/таймаута HTTP-клиента. Это приемлемо —
   * concurrency: 1 гарантирует, что новый job не начнётся, пока worker занят.
   * Для полной отмены нужен AbortController в sync-сервисах (future work).
   */
  private withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    job: Job,
  ): Promise<T> {
    const limitMin = Math.round(timeoutMs / 60_000);

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.logger.error(
          `[sync] TIMEOUT: job ${job.name} (id=${job.id}) превысил лимит ${limitMin} мин ` +
          `(attempt ${job.attemptsMade + 1}/${job.opts.attempts ?? '?'}) — переводим в failed`,
        );
        reject(
          new Error(`Sync job "${job.name}" timed out after ${limitMin} minutes`),
        );
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * Полная синхронизация: TC + TEP + retag + combo populate + cache invalidation.
   */
  private async handleFullSync() {
    // 1. TC sync (retag встроен в конце syncAll)
    const tcResult = await this.tcSync.syncAll();
    this.logger.log(
      `TC sync: ${tcResult.uniqueEvents} событий, ${tcResult.sessionsSynced} сессий, статус: ${tcResult.status}`,
    );

    // 2. Teplohod sync
    const tepResult = await this.tepSync.syncAll();
    this.logger.log(
      `TEP sync: ${tepResult.eventsSynced} событий, статус: ${tepResult.status}`,
    );

    // 3. Финальный retag
    const retagResult = await this.tcSync.retagAll();
    this.logger.log(
      `Retag: ${retagResult.eventsProcessed} событий, ${retagResult.tagsLinked} тегов`,
    );

    // 4. Smart populate combo
    let populateResult = { checked: 0, changed: 0 };
    try {
      populateResult = await this.combo.populateAll();
      this.logger.log(
        `Combo populate: ${populateResult.checked} проверено, ${populateResult.changed} обновлено`,
      );
    } catch (err: unknown) {
      this.logger.warn(`Combo populate ошибка: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 5. Инвалидация кэша
    await this.cache.invalidateAfterSync();

    return {
      tc: tcResult,
      tep: tepResult,
      retag: retagResult,
      combo: populateResult,
    };
  }

  /**
   * Инкрементальная синхронизация: только TC + cache invalidation.
   */
  private async handleIncrementalSync() {
    const tcResult = await this.tcSync.syncAll();
    this.logger.log(
      `TC incremental: ${tcResult.uniqueEvents} событий, статус: ${tcResult.status}`,
    );

    await this.cache.invalidateAfterSync();

    return { tc: tcResult };
  }
}
