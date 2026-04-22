import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@/prisma-client';
import { TicketProviderCode } from '@/prisma-client';

import { ProviderExternalPersistenceService } from '../integrations/provider-external-persistence.service';
import { OrderProjectionService } from '../orders/order-projection.service';
import { mapTcOrderStatusToMirror } from './tc-order-mirror.mapping';
import { TcApiService } from './tc-api.service';

export interface TcOrdersMirrorSyncParams {
  /** Начало интервала created_at (ISO) */
  createdFrom: Date;
  /** Конец интервала created_at (ISO) */
  createdTo: Date;
  /** Фильтр статусов TC, напр. ['done'] или ['done','cancelled'] */
  status?: string[];
  /** Ограничить по id событий TC */
  tcEventIds?: string[];
  onlyWithCustomer?: boolean;
  pageSize?: number;
  maxPages?: number;
  dryRun?: boolean;
  signal?: AbortSignal;
}

export interface TcOrdersMirrorSyncResult {
  dryRun: boolean;
  pagesFetched: number;
  ordersSeen: number;
  upserted: number;
  skippedNoId: number;
  errors: Array<{ message: string }>;
}

function formatCreatedAtRange(from: Date, to: Date): string {
  return `${from.toISOString()},${to.toISOString()}`;
}

function extractTcOrderId(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null;
  const o = row as Record<string, unknown>;
  const id = o.id ?? o._id;
  if (typeof id === 'string' && id.length > 0) return id;
  return null;
}

function extractTcOrderStatus(row: unknown): string | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const s = (row as Record<string, unknown>).status;
  return typeof s === 'string' ? s : undefined;
}

@Injectable()
export class TcOrdersMirrorSyncService {
  private readonly logger = new Logger(TcOrdersMirrorSyncService.name);

  constructor(
    private readonly tcApi: TcApiService,
    private readonly externalPersistence: ProviderExternalPersistenceService,
    private readonly orderProjection: OrderProjectionService,
  ) {}

  /**
   * Проходит страницы GET /v2/resources/orders и upsert в external_order_links для TICKETS_CLOUD.
   */
  async syncMirror(params: TcOrdersMirrorSyncParams): Promise<TcOrdersMirrorSyncResult> {
    const result: TcOrdersMirrorSyncResult = {
      dryRun: Boolean(params.dryRun),
      pagesFetched: 0,
      ordersSeen: 0,
      upserted: 0,
      skippedNoId: 0,
      errors: [],
    };

    const createdAt = formatCreatedAtRange(params.createdFrom, params.createdTo);
    const status =
      params.status && params.status.length > 0 ? params.status.join(',') : undefined;
    const events =
      params.tcEventIds && params.tcEventIds.length > 0 ? params.tcEventIds.join(',') : undefined;
    const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));
    const maxPages = params.maxPages ?? 50;

    let page = 1;
    for (; page <= maxPages; page++) {
      try {
        const list = await this.tcApi.listOrders({
          createdAt,
          status,
          events,
          onlyWithCustomer: params.onlyWithCustomer,
          page,
          pageSize,
          signal: params.signal,
        });
        result.pagesFetched += 1;

        const rows = list.data ?? [];
        result.ordersSeen += rows.length;

        for (const row of rows) {
          const externalOrderId = extractTcOrderId(row);
          if (!externalOrderId) {
            result.skippedNoId += 1;
            continue;
          }
          const tcStatus = extractTcOrderStatus(row);
          const mapped = mapTcOrderStatusToMirror(tcStatus);
          const payloadJson: Prisma.InputJsonValue = {
            source: 'tc_orders_list_sync',
            syncedAt: new Date().toISOString(),
            tcStatus: tcStatus ?? null,
            order: JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue,
          };

          if (params.dryRun) {
            result.upserted += 1;
            continue;
          }

          await this.externalPersistence.upsertExternalOrderMirror({
            provider: TicketProviderCode.TICKETS_CLOUD,
            externalOrderId,
            status: mapped.status,
            integrationState: mapped.integrationState,
            payloadJson,
          });
          result.upserted += 1;

          try {
            await this.orderProjection.upsertFromTcMirror({
              externalOrderId,
              // Узкий best-effort разбор полей покупателя/события из raw payload.
              email: (row as { customer?: { email?: string } }).customer?.email,
              phone: (row as { customer?: { phone?: string } }).customer?.phone,
              title: (row as { event?: { title?: string } }).event?.title,
              date: (row as { event?: { date?: string | Date } }).event?.date,
              amount: typeof (row as { values?: { full?: unknown } }).values?.full === 'number'
                ? Math.round(((row as { values: { full: number } }).values.full || 0) * 100)
                : undefined,
              currency: 'RUB',
              purchasedAt: (row as { created_at?: string | Date }).created_at,
              rawPayload: row,
            });
          } catch (e) {
            this.logger.warn(
              `Order projection (TC mirror) failed for ${externalOrderId}: ${
                e instanceof Error ? e.message : String(e)
              }`,
            );
          }
        }

        const total = list.pagination?.total;
        const hasMore =
          total != null ? page * pageSize < total : rows.length >= pageSize;
        if (rows.length === 0 || !hasMore) {
          break;
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        result.errors.push({ message });
        this.logger.error(`TC mirror sync page ${page}: ${message}`);
        break;
      }
    }

    this.logger.log(
      `tc_orders_mirror_sync dryRun=${result.dryRun} pages=${result.pagesFetched} seen=${result.ordersSeen} upserted=${result.upserted} skippedNoId=${result.skippedNoId} errors=${result.errors.length}`,
    );

    return result;
  }

  /** Разбор argv для scripts/sync-tc-orders-mirror.ts */
  parseCliArgs(argv: string[]): TcOrdersMirrorSyncParams {
    const dryRun = argv.includes('--dry-run');
    let hours = 24;
    let maxPages = 50;
    let pageSize = 50;
    let onlyWithCustomer: boolean | undefined;
    const status: string[] = [];

    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === '--hours' && argv[i + 1]) {
        hours = Math.max(1, parseInt(argv[i + 1]!, 10) || 24);
        i++;
      } else if (a === '--max-pages' && argv[i + 1]) {
        maxPages = Math.max(1, parseInt(argv[i + 1]!, 10) || 50);
        i++;
      } else if (a === '--page-size' && argv[i + 1]) {
        pageSize = Math.min(200, Math.max(1, parseInt(argv[i + 1]!, 10) || 50));
        i++;
      } else if (a === '--status' && argv[i + 1]) {
        status.push(...argv[i + 1]!.split(',').map((s) => s.trim()).filter(Boolean));
        i++;
      } else if (a === '--only-with-customer') {
        onlyWithCustomer = true;
      }
    }

    const createdTo = new Date();
    const createdFrom = new Date(createdTo.getTime() - hours * 3600 * 1000);

    return {
      createdFrom,
      createdTo,
      status: status.length ? status : ['done'],
      onlyWithCustomer,
      pageSize,
      maxPages,
      dryRun,
    };
  }
}
