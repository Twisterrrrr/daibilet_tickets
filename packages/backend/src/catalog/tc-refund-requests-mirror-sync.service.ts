import { Injectable, Logger } from '@nestjs/common';
import { RefundCreatedByType, RefundRequestStatus } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';
import { mapTcRefundStatusToRefundRequestStatus } from './tc-refund-request-status.mapping';
import { TcApiService } from './tc-api.service';

export interface TcRefundRequestsMirrorSyncParams {
  createdFrom: Date;
  createdTo: Date;
  /** Фильтр статусов TC (new, in_progress, approved, rejected) — пусто = все */
  tcStatusFilter?: string[];
  tcEventIds?: string[];
  pageSize?: number;
  maxPages?: number;
  dryRun?: boolean;
  signal?: AbortSignal;
}

export interface TcRefundRequestsMirrorSyncResult {
  dryRun: boolean;
  pagesFetched: number;
  refundsSeen: number;
  /** Найдена позиция fulfillment с тем же TC order id */
  itemsMatched: number;
  /** Обновлена заявка RefundRequest */
  refundRequestsUpdated: number;
  skippedNoOrderId: number;
  skippedNoFulfillment: number;
  skippedNoRefundRequest: number;
  skippedUnmappedStatus: number;
  skippedNoopAlready: number;
  skippedWouldDowngradeTerminal: number;
  errors: Array<{ message: string }>;
}

function formatRange(from: Date, to: Date): string {
  return `${from.toISOString()},${to.toISOString()}`;
}

function extractTcRefundOrderId(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null;
  const order = (row as Record<string, unknown>).order;
  return typeof order === 'string' && order.length > 0 ? order : null;
}

function extractTcRefundStatus(row: unknown): string | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const s = (row as Record<string, unknown>).status;
  return typeof s === 'string' ? s : undefined;
}

const LOCAL_TERMINAL: RefundRequestStatus[] = [
  RefundRequestStatus.COMPLETED,
  RefundRequestStatus.REJECTED,
  RefundRequestStatus.FAILED,
];

@Injectable()
export class TcRefundRequestsMirrorSyncService {
  private readonly logger = new Logger(TcRefundRequestsMirrorSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tcApi: TcApiService,
  ) {}

  /**
   * Подтягивает список возвратов TC и обновляет RefundRequest для позиций с provider=TC и тем же externalOrderId, что и поле order в TC.
   */
  async syncRefundStatuses(params: TcRefundRequestsMirrorSyncParams): Promise<TcRefundRequestsMirrorSyncResult> {
    const result: TcRefundRequestsMirrorSyncResult = {
      dryRun: Boolean(params.dryRun),
      pagesFetched: 0,
      refundsSeen: 0,
      itemsMatched: 0,
      refundRequestsUpdated: 0,
      skippedNoOrderId: 0,
      skippedNoFulfillment: 0,
      skippedNoRefundRequest: 0,
      skippedUnmappedStatus: 0,
      skippedNoopAlready: 0,
      skippedWouldDowngradeTerminal: 0,
      errors: [],
    };

    const createdAt = formatRange(params.createdFrom, params.createdTo);
    const statusParam =
      params.tcStatusFilter && params.tcStatusFilter.length > 0
        ? params.tcStatusFilter.join(',')
        : undefined;
    const events =
      params.tcEventIds && params.tcEventIds.length > 0 ? params.tcEventIds.join(',') : undefined;
    const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));
    const maxPages = params.maxPages ?? 50;

    let page = 1;
    for (; page <= maxPages; page++) {
      try {
        const list = await this.tcApi.listRefundRequests({
          createdAt,
          status: statusParam,
          events,
          page,
          pageSize,
          signal: params.signal,
        });
        result.pagesFetched += 1;

        const rows = list.data ?? [];
        result.refundsSeen += rows.length;

        for (const row of rows) {
          const tcOrderId = extractTcRefundOrderId(row);
          if (!tcOrderId) {
            result.skippedNoOrderId += 1;
            continue;
          }

          const tcStatusRaw = extractTcRefundStatus(row);
          const nextStatus = mapTcRefundStatusToRefundRequestStatus(tcStatusRaw);
          if (!nextStatus) {
            result.skippedUnmappedStatus += 1;
            continue;
          }

          const items = await this.prisma.fulfillmentItem.findMany({
            where: {
              provider: 'TC',
              externalOrderId: tcOrderId,
            },
            select: { id: true },
          });

          if (items.length === 0) {
            result.skippedNoFulfillment += 1;
            continue;
          }
          result.itemsMatched += items.length;

          for (const { id: fulfillmentItemId } of items) {
            const rr = await this.prisma.refundRequest.findFirst({
              where: { fulfillmentItemId },
              orderBy: { createdAt: 'desc' },
            });

            if (!rr) {
              result.skippedNoRefundRequest += 1;
              continue;
            }

            if (rr.status === nextStatus) {
              result.skippedNoopAlready += 1;
              continue;
            }

            if (
              LOCAL_TERMINAL.includes(rr.status) &&
              (nextStatus === RefundRequestStatus.CREATED || nextStatus === RefundRequestStatus.PROCESSING)
            ) {
              result.skippedWouldDowngradeTerminal += 1;
              continue;
            }

            const processedAt =
              nextStatus === RefundRequestStatus.COMPLETED || nextStatus === RefundRequestStatus.REJECTED
                ? new Date()
                : undefined;

            if (params.dryRun) {
              result.refundRequestsUpdated += 1;
              continue;
            }

            await this.prisma.refundRequest.update({
              where: { id: rr.id },
              data: {
                status: nextStatus,
                ...(processedAt ? { processedAt } : {}),
                createdByType: RefundCreatedByType.SYSTEM,
              },
            });
            result.refundRequestsUpdated += 1;
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
        this.logger.error(`TC refund mirror page ${page}: ${message}`);
        break;
      }
    }

    this.logger.log(
      `tc_refund_requests_mirror dryRun=${result.dryRun} pages=${result.pagesFetched} seen=${result.refundsSeen} updated=${result.refundRequestsUpdated} skippedFulfillment=${result.skippedNoFulfillment} errors=${result.errors.length}`,
    );

    return result;
  }

  parseCliArgs(argv: string[]): TcRefundRequestsMirrorSyncParams {
    const dryRun = argv.includes('--dry-run');
    let hours = 24 * 7;
    let maxPages = 50;
    let pageSize = 50;
    const tcStatusFilter: string[] = [];

    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === '--hours' && argv[i + 1]) {
        hours = Math.max(1, parseInt(argv[i + 1]!, 10) || 24 * 7);
        i++;
      } else if (a === '--max-pages' && argv[i + 1]) {
        maxPages = Math.max(1, parseInt(argv[i + 1]!, 10) || 50);
        i++;
      } else if (a === '--page-size' && argv[i + 1]) {
        pageSize = Math.min(200, Math.max(1, parseInt(argv[i + 1]!, 10) || 50));
        i++;
      } else if (a === '--status' && argv[i + 1]) {
        tcStatusFilter.push(...argv[i + 1]!.split(',').map((s) => s.trim()).filter(Boolean));
        i++;
      }
    }

    const createdTo = new Date();
    const createdFrom = new Date(createdTo.getTime() - hours * 3600 * 1000);

    return {
      createdFrom,
      createdTo,
      tcStatusFilter: tcStatusFilter.length ? tcStatusFilter : undefined,
      pageSize,
      maxPages,
      dryRun,
    };
  }
}
