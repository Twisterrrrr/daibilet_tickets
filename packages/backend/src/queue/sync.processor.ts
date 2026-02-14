import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TcSyncService } from '../catalog/tc-sync.service';
import { TepSyncService } from '../catalog/tep-sync.service';
import { ComboService } from '../combo/combo.service';
import { CacheService } from '../cache/cache.service';
import { QUEUE_SYNC } from './queue.constants';

export type SyncJobData = Record<string, never>;

@Processor(QUEUE_SYNC)
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
    this.logger.log(`Processing sync job: ${job.name} (attempt ${job.attemptsMade + 1})`);

    switch (job.name) {
      case 'sync-full':
        return this.handleFullSync();

      case 'sync-incremental':
        return this.handleIncrementalSync();

      default:
        this.logger.warn(`Unknown sync job name: ${job.name}`);
        return null;
    }
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
