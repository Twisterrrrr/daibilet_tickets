import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import { TcOrdersMirrorSyncService } from '../catalog/tc-orders-mirror-sync.service';
import { TcRefundRequestsMirrorSyncService } from '../catalog/tc-refund-requests-mirror-sync.service';

/**
 * Периодическое зеркалирование из Ticketscloud HTTP API в нашу БД.
 *
 * Уже существующие задачи (см. {@link SchedulerService} и SyncProcessor):
 * - **Каталог TC** — инкрементально ~каждый час (`incremental-tc-sync`), полный TC+**TEP**+retag — каждые 6 ч (`full-sync`).
 * - **Каталог Teplohod** — только в составе `sync-full` (отдельного «зеркала заказов TEP» в коде пока нет).
 *
 * Здесь:
 * - **Заказы TC** → `external_order_links` (`GET /v2/resources/orders`)
 * - **Возвраты TC** → обновление `RefundRequest` по `GET /v2/resources/refund_requests`
 *
 * Мульти-инстанс: upsert идемпотентен; при нескольких репликах возможны лишние запросы к API —
 * при необходимости отключите крон на лишних инстансах: `TC_MIRROR_CRON_ENABLED=false`.
 *
 * @see https://ticketscloud.readthedocs.io/ru/latest/extra/orders_list.html
 * @see https://ticketscloud.readthedocs.io/ru/latest/extra/refunds_list.html
 */
@Injectable()
export class TicketscloudMirrorSchedulerService {
  private readonly logger = new Logger(TicketscloudMirrorSchedulerService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly ordersMirror: TcOrdersMirrorSyncService,
    private readonly refundsMirror: TcRefundRequestsMirrorSyncService,
  ) {}

  private mirrorCronEnabled(): boolean {
    if (this.config.get<string>('TC_MIRROR_CRON_ENABLED', 'true')?.toLowerCase() === 'false') {
      return false;
    }
    const token = this.config.get<string>('TC_API_TOKEN', '');
    if (!token) {
      return false;
    }
    return true;
  }

  private ordersWindowHours(): number {
    const raw = this.config.get<string>('TC_ORDERS_MIRROR_WINDOW_HOURS', '2');
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 1 && n <= 168 ? n : 2;
  }

  private refundsWindowHours(): number {
    const raw = this.config.get<string>('TC_REFUNDS_MIRROR_WINDOW_HOURS', '4');
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 1 && n <= 168 ? n : 4;
  }

  /**
   * Зеркало списка заказов TC (агентский учёт).
   * По умолчанию каждые 30 минут; окно `created_at` — последние N часов (перекрытие против пропусков).
   */
  @Cron('0 */30 * * * *', { name: 'tc-orders-mirror-sync' })
  async handleTcOrdersMirror(): Promise<void> {
    if (!this.mirrorCronEnabled()) {
      return;
    }

    const createdTo = new Date();
    const createdFrom = new Date(createdTo.getTime() - this.ordersWindowHours() * 3600 * 1000);

    this.logger.log(
      `CRON tc-orders-mirror: window ${createdFrom.toISOString()} … ${createdTo.toISOString()} (hours=${this.ordersWindowHours()})`,
    );

    try {
      const result = await this.ordersMirror.syncMirror({
        createdFrom,
        createdTo,
        status: ['done'],
        pageSize: 100,
        maxPages: 30,
        dryRun: false,
      });
      this.logger.log(
        `tc-orders-mirror: pages=${result.pagesFetched} seen=${result.ordersSeen} upserted=${result.upserted} skipped=${result.skippedNoId} err=${result.errors.length}`,
      );
    } catch (err: unknown) {
      this.logger.error(`tc-orders-mirror failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Синхронизация статусов возвратов с TC (без ручного ввода в админке).
   * Реже списка заказов: раз в час в :17 (не пересекается с :00/:30 заказов).
   */
  @Cron('0 17 * * * *', { name: 'tc-refund-requests-mirror-sync' })
  async handleTcRefundRequestsMirror(): Promise<void> {
    if (!this.mirrorCronEnabled()) {
      return;
    }

    const createdTo = new Date();
    const createdFrom = new Date(createdTo.getTime() - this.refundsWindowHours() * 3600 * 1000);

    this.logger.log(
      `CRON tc-refund-requests-mirror: window ${createdFrom.toISOString()} … ${createdTo.toISOString()} (hours=${this.refundsWindowHours()})`,
    );

    try {
      const result = await this.refundsMirror.syncRefundStatuses({
        createdFrom,
        createdTo,
        pageSize: 100,
        maxPages: 30,
        dryRun: false,
      });
      this.logger.log(
        `tc-refund-requests-mirror: pages=${result.pagesFetched} seen=${result.refundsSeen} updated=${result.refundRequestsUpdated} ` +
          `noFulfillment=${result.skippedNoFulfillment} noLocalRefund=${result.skippedNoRefundRequest} err=${result.errors.length}`,
      );
    } catch (err: unknown) {
      this.logger.error(
        `tc-refund-requests-mirror failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
