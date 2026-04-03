import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ExternalIntegrationState, Prisma, type ExternalOrderStatus } from '@prisma/client';

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
  async externalOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('integrationState') integrationState?: string,
  ) {
    const pg = parsePagination({ page, limit });
    const where: Prisma.ExternalOrderLinkWhereInput = {};
    if (provider) {
      where.provider = parseTicketProviderCodeParam(provider);
    }
    if (status) {
      where.status = status as ExternalOrderStatus;
    }
    if (integrationState) {
      where.integrationState = integrationState as ExternalIntegrationState;
    }
    const [items, total] = await Promise.all([
      this.prisma.externalOrderLink.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.externalOrderLink.count({ where }),
    ]);
    return buildPaginatedResult(items, total, pg.limit);
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
