import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TcSyncService } from '../catalog/tc-sync.service';
import { TepSyncService } from '../catalog/tep-sync.service';
import { CacheService } from '../cache/cache.service';
import { ComboService } from '../combo/combo.service';

/**
 * Scheduler Service — автоматическая синхронизация данных.
 *
 * Расписание:
 * - Полная синхронизация TC + TEP + retag + smart populate: каждые 6 часов
 * - Инкрементальная синхронизация TC: каждые 30 минут
 * - Дедупликация: раз в сутки (03:00)
 *
 * Combo populate теперь УМНЫЙ:
 * - Пропускает combo с валидными curatedEvents (SEO-стабильность)
 * - Перезаполняет только если >30% событий невалидны
 * - Нагрузка O(1 count-запрос на combo) для проверки
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private isSyncing = false;

  constructor(
    private readonly tcSync: TcSyncService,
    private readonly tepSync: TepSyncService,
    private readonly cache: CacheService,
    private readonly combo: ComboService,
  ) {}

  /**
   * Полная синхронизация всех источников + retag + smart populate.
   */
  @Cron('0 0 0,6,12,18 * * *', { name: 'full-sync' })
  async handleFullSync() {
    if (this.isSyncing) {
      this.logger.warn('Полная синхронизация пропущена — предыдущая ещё выполняется');
      return;
    }

    this.isSyncing = true;
    this.logger.log('=== CRON: Полная синхронизация ===');

    try {
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

      // 4. Smart populate combo (проверяет валидность, не трогает здоровые)
      try {
        const populateResult = await this.combo.populateAll();
        this.logger.log(
          `Combo populate: ${populateResult.checked} проверено, ${populateResult.changed} обновлено`,
        );
      } catch (err: any) {
        this.logger.warn(`Combo populate ошибка: ${err.message}`);
      }

      // 5. Инвалидация кэша
      await this.cache.invalidateAfterSync();
    } catch (err: any) {
      this.logger.error(`Полная синхронизация — ошибка: ${err.message}`);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Инкрементальная синхронизация TC.
   */
  @Cron('0 30 * * * *', { name: 'incremental-tc-sync' })
  async handleIncrementalSync() {
    if (this.isSyncing) {
      this.logger.debug('Инкрементальная синхронизация пропущена — занято');
      return;
    }

    const hour = new Date().getHours();
    if ([0, 6, 12, 18].includes(hour)) {
      this.logger.debug('Инкрементальная пропущена — час полной синхронизации');
      return;
    }

    this.isSyncing = true;
    this.logger.log('=== CRON: Инкрементальная синхронизация TC ===');

    try {
      const result = await this.tcSync.syncAll();
      this.logger.log(
        `TC incremental: ${result.uniqueEvents} событий, статус: ${result.status}`,
      );
      await this.cache.invalidateAfterSync();
    } catch (err: any) {
      this.logger.error(`Инкрементальная синхронизация — ошибка: ${err.message}`);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Дедупликация — раз в сутки в 03:00.
   */
  @Cron('0 0 3 * * *', { name: 'daily-dedup' })
  async handleDailyDedup() {
    this.logger.log('=== CRON: Дедупликация ===');

    try {
      const result = await this.tcSync.deduplicateExisting();
      this.logger.log(
        `Dedup: ${result.groupsProcessed} групп, ${result.duplicatesRemoved} дублей удалено`,
      );
    } catch (err: any) {
      this.logger.error(`Дедупликация — ошибка: ${err.message}`);
    }
  }
}
