import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  ExternalIntegrationState,
  ExternalRefundRequestStatus,
  Prisma,
  type ExternalOrderStatus,
} from '@/prisma-client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { parseTicketProviderCodeParam } from './routing/parse-provider-code';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderRegistryService } from './routing/provider-registry.service';
import { ProviderRoutingService } from './routing/provider-routing.service';

@ApiTags('admin/integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR', 'VIEWER')
@Controller('admin')
export class AdminIntegrationsReadController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ProviderRegistryService,
    private readonly routing: ProviderRoutingService,
  ) {}

  @Get('integrations/providers')
  @ApiOperation({ summary: 'Список ticket providers + дескрипторы (read-only)' })
  listProviders() {
    return this.registry.listAdminSummaries();
  }

  @Get('integrations/routing/debug')
  @ApiOperation({ summary: 'Диагностика маршрутизации ticket provider для события' })
  @ApiQuery({ name: 'eventId', required: true })
  async routingDebug(@Query('eventId') eventId: string) {
    return this.routing.resolveProviderDebug(eventId);
  }

  @Get('external-orders')
  @ApiOperation({ summary: 'Внешние заказы (ExternalOrderLink)' })
  @ApiQuery({ name: 'search', required: false, description: 'Подстрока externalOrderId; при полном UUID — также совпадение по id ссылки' })
  @ApiQuery({ name: 'hasRefundRequests', required: false, description: 'true | false' })
  @ApiQuery({ name: 'refundPending', required: false, description: 'true — есть заявка не в терминальном статусе' })
  async externalOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('integrationState') integrationState?: string,
    @Query('hasRefundRequests') hasRefundRequests?: string,
    @Query('refundPending') refundPending?: string,
    @Query('search') search?: string,
  ) {
    const pg = parsePagination({ page, limit });
    const parts: Prisma.ExternalOrderLinkWhereInput[] = [];

    const base: Prisma.ExternalOrderLinkWhereInput = {};
    if (provider) {
      base.provider = parseTicketProviderCodeParam(provider);
    }
    if (status) {
      base.status = status as ExternalOrderStatus;
    }
    if (integrationState) {
      base.integrationState = integrationState as ExternalIntegrationState;
    }
    if (Object.keys(base).length > 0) {
      parts.push(base);
    }

    const terminalRefundStatuses: ExternalRefundRequestStatus[] = [
      ExternalRefundRequestStatus.COMPLETED,
      ExternalRefundRequestStatus.REJECTED,
      ExternalRefundRequestStatus.CANCELED,
    ];

    const refundClauses: Prisma.ExternalOrderLinkWhereInput[] = [];
    const hrr = hasRefundRequests?.trim().toLowerCase();
    if (hrr === 'true' || hrr === '1' || hrr === 'yes') {
      refundClauses.push({ refundRequests: { some: {} } });
    } else if (hrr === 'false' || hrr === '0' || hrr === 'no') {
      refundClauses.push({ refundRequests: { none: {} } });
    }

    const rp = refundPending?.trim().toLowerCase();
    if (rp === 'true' || rp === '1' || rp === 'yes') {
      refundClauses.push({
        refundRequests: { some: { status: { notIn: terminalRefundStatuses } } },
      });
    } else if (rp === 'false' || rp === '0' || rp === 'no') {
      refundClauses.push({
        NOT: {
          refundRequests: {
            some: { status: { notIn: terminalRefundStatuses } },
          },
        },
      });
    }

    if (refundClauses.length === 1) {
      parts.push(refundClauses[0]!);
    } else if (refundClauses.length > 1) {
      parts.push({ AND: refundClauses });
    }

    const q = search?.trim();
    if (q) {
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const orFilters: Prisma.ExternalOrderLinkWhereInput[] = [
        { externalOrderId: { contains: q, mode: 'insensitive' } },
      ];
      if (uuidRe.test(q)) {
        orFilters.push({ id: q });
      }
      parts.push({ OR: orFilters });
    }

    const where: Prisma.ExternalOrderLinkWhereInput =
      parts.length === 0 ? {} : parts.length === 1 ? parts[0]! : { AND: parts };

    const [items, total] = await Promise.all([
      this.prisma.externalOrderLink.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { refundRequests: true } },
        },
        ...paginationArgs(pg),
      }),
      this.prisma.externalOrderLink.count({ where }),
    ]);

    const ids = items.map((o) => o.id);
    const pendingRows =
      ids.length > 0
        ? await this.prisma.externalRefundRequest.findMany({
            where: {
              externalOrderLinkId: { in: ids },
              status: { notIn: terminalRefundStatuses },
            },
            select: { externalOrderLinkId: true },
          })
        : [];
    const pendingByOrderId = new Set(pendingRows.map((r) => r.externalOrderLinkId));

    const dtoItems = items.map((o) => {
      const payload = (o.payloadJson ?? {}) as any;
      const isTep = o.provider === 'TEPLOHOD';
      const eventTitle = isTep
        ? (typeof payload.walkTitle === 'string' ? payload.walkTitle : null)
        : (typeof payload.eventTitle === 'string' ? payload.eventTitle : null) ??
          (typeof payload?.order?.event?.title === 'string' ? payload.order.event.title : null);

      const eventDateLabel = isTep
        ? typeof payload.date === 'string' && typeof payload.time === 'string'
          ? `${payload.date} ${payload.time}`
          : typeof payload.eventDateTimeLocalIso === 'string'
            ? payload.eventDateTimeLocalIso
            : null
        : typeof payload.eventDateLabel === 'string'
          ? payload.eventDateLabel
          : null;

      return {
        id: o.id,
        provider: o.provider,
        status: o.status,
        integrationState: o.integrationState,
        createdAt: o.createdAt.toISOString(),
        externalOrderId: o.externalOrderId ?? null,
        eventTitle,
        eventDateLabel,
        refundRequestsCount: o._count?.refundRequests ?? 0,
        hasPendingRefundRequests: pendingByOrderId.has(o.id),
      };
    });
    return buildPaginatedResult(dtoItems, total, pg.limit);
  }

  @Get('provider-webhooks')
  @ApiOperation({ summary: 'Лог входящих webhooks ticket providers' })
  async webhookLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('provider') provider?: string,
  ) {
    const pg = parsePagination({ page, limit });
    const where: Prisma.ProviderWebhookLogWhereInput = {};
    if (provider) {
      where.provider = parseTicketProviderCodeParam(provider);
    }
    const [items, total] = await Promise.all([
      this.prisma.providerWebhookLog.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.providerWebhookLog.count({ where }),
    ]);
    return buildPaginatedResult(items, total, pg.limit);
  }
}
