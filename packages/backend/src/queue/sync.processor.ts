import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventSource } from '@prisma/client';

import { CacheService } from '../cache/cache.service';
import { PostEditQueueService } from '../catalog/postedit-queue.service';
import { TcSyncService } from '../catalog/tc-sync.service';
import { TepSyncService } from '../catalog/tep-sync.service';
import { ComboService } from '../combo/combo.service';
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
const FULL_SYNC_TIMEOUT_MS = 90 * 60_000; // 90 минут
const INCREMENTAL_TIMEOUT_MS = 30 * 60_000; // 30 минут

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
    private readonly postEditQueue: PostEditQueueService,
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
          return await this.withTimeout((signal) => this.handleFullSync(signal), FULL_SYNC_TIMEOUT_MS, job);

        case 'sync-incremental':
          return await this.withTimeout((signal) => this.handleIncrementalSync(signal), INCREMENTAL_TIMEOUT_MS, job);

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
   * Обёртка с hard timeout + AbortController.
   *
   * При превышении лимита:
   * 1. Вызываем ctrl.abort() → HTTP-запросы TC/TEP отменяются
   * 2. Логируем ERROR (виден в мониторинге)
   * 3. Кидаем Error → BullMQ переводит job в failed
   * 4. Если остались attempts — BullMQ retry с exponential backoff
   * 5. Если attempts исчерпаны — job в failed, следующий cron-тик создаст новый
   */
  private withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number, job: Job): Promise<T> {
    const limitMin = Math.round(timeoutMs / 60_000);
    const ctrl = new AbortController();

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.logger.error(
          `[sync] TIMEOUT: job ${job.name} (id=${job.id}) превысил лимит ${limitMin} мин ` +
            `(attempt ${job.attemptsMade + 1}/${job.opts.attempts ?? '?'}) — abort + failed`,
        );
        ctrl.abort();
        reject(new Error(`Sync job "${job.name}" timed out after ${limitMin} minutes`));
      }, timeoutMs);

      fn(ctrl.signal)
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
   * Полная синхронизация: TC + TEP + retag + combo populate + cache invalidation + очередь постредакции.
   */
  private async handleFullSync(signal?: AbortSignal) {
    const runStartedAt = new Date();

    // 1. TC sync (retag встроен в конце syncAll)
    const tcResult = await this.tcSync.syncAll();
    this.logger.log(
      `TC sync: ${tcResult.uniqueEvents} событий, ${tcResult.sessionsSynced} сессий, статус: ${tcResult.status}`,
    );

    // 2. Teplohod sync
    const tepResult = await this.tepSync.syncAll(signal);
    this.logger.log(`TEP sync: ${tepResult.eventsSynced} событий, статус: ${tepResult.status}`);

    // 2.1 Очередь постредакции: ensure overrides для импортных событий (NEEDS_REVIEW в Directus)
    try {
      const queueTc = await this.postEditQueue.ensureOverridesForImportedEvents({
        source: EventSource.TC,
        since: runStartedAt,
      });
      const queueTep = await this.postEditQueue.ensureOverridesForImportedEvents({
        source: EventSource.TEPLOHOD,
        since: runStartedAt,
      });
      this.logger.log(
        `Post-edit queue: TC created=${queueTc.created} updated=${queueTc.updated}, TEP created=${queueTep.created} updated=${queueTep.updated}`,
      );
    } catch (err: unknown) {
      this.logger.warn(`Post-edit queue error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 3. Финальный retag
    const retagResult = await this.tcSync.retagAll();
    this.logger.log(`Retag: ${retagResult.eventsProcessed} событий, ${retagResult.tagsLinked} тегов`);

    // 4. Smart populate combo
    let populateResult = { checked: 0, changed: 0 };
    try {
      populateResult = await this.combo.populateAll();
      this.logger.log(`Combo populate: ${populateResult.checked} проверено, ${populateResult.changed} обновлено`);
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
   * Инкрементальная синхронизация: только TC + очередь постредакции + cache invalidation.
   */
  private async handleIncrementalSync(signal?: AbortSignal) {
    const runStartedAt = new Date();
    const tcResult = await this.tcSync.syncAll();
    this.logger.log(`TC incremental: ${tcResult.uniqueEvents} событий, статус: ${tcResult.status}`);

    try {
      const queue = await this.postEditQueue.ensureOverridesForImportedEvents({
        source: EventSource.TC,
        since: runStartedAt,
      });
      this.logger.log(`Post-edit queue: TC created=${queue.created} updated=${queue.updated}`);
    } catch (err: unknown) {
      this.logger.warn(`Post-edit queue error: ${err instanceof Error ? err.message : String(err)}`);
    }

    await this.cache.invalidateAfterSync();

    return { tc: tcResult };
  }
}
