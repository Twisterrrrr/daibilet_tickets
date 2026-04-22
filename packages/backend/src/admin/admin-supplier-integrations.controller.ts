import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@/prisma-client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { maskPii } from '../common/pii-mask.util';
import { PrismaService } from '../prisma/prisma.service';

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

type CreateIntegrationBody = {
  supplierId: string;
  adapterCode: string;
  adapterName?: string | null;
  name: string;
  acquisitionMode?: string | null;
  status?: string | null;
  environment?: string | null;
  syncMode?: string | null;
  connection?: {
    endpointUrl?: string | null;
    authType?: string | null;
    credentials?: Record<string, unknown> | null;
  } | null;
  mapping?: Record<string, unknown> | null;
  capabilities?: Record<string, unknown> | null;
};

type PatchIntegrationBody = Partial<Omit<CreateIntegrationBody, 'supplierId'>>;

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/supplier-integrations')
export class AdminSupplierIntegrationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Список интеграций поставщиков (admin)' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'supplierId', required: false, isArray: true })
  @ApiQuery({ name: 'adapterCode', required: false, isArray: true })
  @ApiQuery({ name: 'status', required: false, isArray: true })
  @ApiQuery({ name: 'acquisitionMode', required: false, isArray: true })
  @ApiQuery({ name: 'environment', required: false, isArray: true })
  @ApiQuery({ name: 'hasErrors', required: false })
  @ApiQuery({ name: 'hasOpenIssues', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortDir', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async list(
    @Query('q') q?: string,
    @Query('supplierId') supplierId?: string[] | string,
    @Query('adapterCode') adapterCode?: string[] | string,
    @Query('status') status?: string[] | string,
    @Query('acquisitionMode') acquisitionMode?: string[] | string,
    @Query('environment') environment?: string[] | string,
    @Query('hasErrors') hasErrors?: string,
    @Query('hasOpenIssues') hasOpenIssues?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc' | string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pg = parsePagination({ page, limit: pageSize });

    const where: Prisma.SupplierIntegrationWhereInput = {};
    const supplierIds = Array.isArray(supplierId) ? supplierId : supplierId ? [supplierId] : [];
    const adapterCodes = Array.isArray(adapterCode) ? adapterCode : adapterCode ? [adapterCode] : [];
    const statuses = Array.isArray(status) ? status : status ? [status] : [];
    const acquisitionModes = Array.isArray(acquisitionMode) ? acquisitionMode : acquisitionMode ? [acquisitionMode] : [];
    const environments = Array.isArray(environment) ? environment : environment ? [environment] : [];

    if (supplierIds.length > 0) where.operatorId = { in: supplierIds };
    if (adapterCodes.length > 0) where.adapterCode = { in: adapterCodes };
    if (statuses.length > 0) where.status = { in: statuses };
    if (acquisitionModes.length > 0) where.acquisitionMode = { in: acquisitionModes };
    if (environments.length > 0) where.environment = { in: environments };

    if (q && q.trim().length > 0) {
      const needle = q.trim();
      where.OR = [
        { name: { contains: needle, mode: 'insensitive' } },
        { adapterCode: { contains: needle, mode: 'insensitive' } },
        { adapterName: { contains: needle, mode: 'insensitive' } },
        { operator: { name: { contains: needle, mode: 'insensitive' } } },
      ];
    }

    if (hasErrors === 'true') {
      where.consecutiveErrorCount = { gt: 0 };
    }
    if (hasOpenIssues === 'true') {
      where.openIssuesCountCached = { gt: 0 };
    }

    const orderBy: Prisma.SupplierIntegrationOrderByWithRelationInput = (() => {
      const dir = sortDir === 'asc' ? 'asc' : 'desc';
      switch (sortBy) {
        case 'updatedAt':
          return { updatedAt: dir };
        case 'lastSuccessAt':
          return { lastSuccessAt: dir };
        case 'lastErrorAt':
          return { lastErrorAt: dir };
        case 'name':
          return { name: dir };
        default:
          return { updatedAt: 'desc' };
      }
    })();

    const [items, total] = await Promise.all([
      this.prisma.supplierIntegration.findMany({
        where,
        include: { operator: { select: { id: true, name: true } } },
        orderBy,
        ...paginationArgs(pg),
      }),
      this.prisma.supplierIntegration.count({ where }),
    ]);

    return {
      items: items.map((it) => ({
        id: it.id,
        supplierId: it.operatorId,
        supplierName: it.operator?.name ?? '—',
        adapterCode: it.adapterCode,
        adapterName: it.adapterName ?? null,
        name: it.name,
        acquisitionMode: it.acquisitionMode ?? null,
        status: it.status ?? null,
        environment: it.environment ?? null,
        syncMode: it.syncMode ?? null,
        lastSuccessAt: it.lastSuccessAt?.toISOString() ?? null,
        lastErrorAt: it.lastErrorAt?.toISOString() ?? null,
        consecutiveErrorCount: it.consecutiveErrorCount ?? 0,
        openIssuesCount: it.openIssuesCountCached ?? 0,
        lastRunSummary: it.lastRunSummaryCached ?? null,
      })),
      total,
    };
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Деталь интеграции (admin)' })
  async get(@Param('id') id: string) {
    const it = await this.prisma.supplierIntegration.findUnique({
      where: { id },
      include: { operator: { select: { id: true, name: true } } },
    });
    if (!it) throw new NotFoundException('Integration not found');

    const conn = (it.connectionJson ?? null) as null | {
      endpointUrl?: string | null;
      authType?: string | null;
      credentials?: Record<string, unknown> | null;
    };

    const maskedCredentials = conn?.credentials ? (maskPii(conn.credentials) as Record<string, unknown>) : null;

    return {
      id: it.id,
      supplierId: it.operatorId,
      supplierName: it.operator?.name ?? '—',
      adapterCode: it.adapterCode,
      adapterName: it.adapterName ?? null,
      name: it.name,
      acquisitionMode: it.acquisitionMode ?? null,
      status: it.status ?? null,
      environment: it.environment ?? null,
      syncMode: it.syncMode ?? null,
      connection: {
        endpointUrl: conn?.endpointUrl ?? null,
        authType: conn?.authType ?? null,
        maskedCredentials,
      },
      capabilities: (it.capabilitiesJson ?? null) as Record<string, unknown> | null,
      mapping: (it.mappingJson ?? null) as Record<string, unknown> | null,
      health: (it.healthJson ?? null) as Record<string, unknown> | null,
      lastSuccessAt: it.lastSuccessAt?.toISOString() ?? null,
      lastErrorAt: it.lastErrorAt?.toISOString() ?? null,
      consecutiveErrorCount: it.consecutiveErrorCount ?? 0,
    };
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Создать интеграцию (admin)' })
  async create(@Body() body: CreateIntegrationBody) {
    if (!body?.supplierId) throw new BadRequestException('supplierId is required');
    if (!body?.adapterCode) throw new BadRequestException('adapterCode is required');
    if (!body?.name) throw new BadRequestException('name is required');

    const created = await this.prisma.supplierIntegration.create({
      data: {
        operatorId: body.supplierId,
        adapterCode: body.adapterCode,
        adapterName: body.adapterName ?? null,
        name: body.name,
        acquisitionMode: body.acquisitionMode ?? null,
        status: body.status ?? 'ACTIVE',
        environment: body.environment ?? 'PRODUCTION',
        syncMode: body.syncMode ?? 'PULL',
        connectionJson: body.connection
          ? toJsonInput({
              endpointUrl: body.connection.endpointUrl ?? null,
              authType: body.connection.authType ?? null,
              credentials: body.connection.credentials ?? null,
            })
          : undefined,
        mappingJson: body.mapping ? toJsonInput(body.mapping) : undefined,
        capabilitiesJson: body.capabilities ? toJsonInput(body.capabilities) : undefined,
      },
    });

    return { id: created.id };
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Обновить интеграцию (admin)' })
  async patch(@Param('id') id: string, @Body() body: PatchIntegrationBody) {
    const current = await this.prisma.supplierIntegration.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Integration not found');

    const nextConnection =
      body.connection === undefined
        ? undefined
        : body.connection === null
          ? null
          : {
              endpointUrl: body.connection.endpointUrl ?? null,
              authType: body.connection.authType ?? null,
              credentials: body.connection.credentials ?? null,
            };

    await this.prisma.supplierIntegration.update({
      where: { id },
      data: {
        ...(body.adapterCode !== undefined ? { adapterCode: body.adapterCode } : {}),
        ...(body.adapterName !== undefined ? { adapterName: body.adapterName ?? null } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.acquisitionMode !== undefined ? { acquisitionMode: body.acquisitionMode ?? null } : {}),
        ...(body.status !== undefined ? { status: body.status ?? null } : {}),
        ...(body.environment !== undefined ? { environment: body.environment ?? null } : {}),
        ...(body.syncMode !== undefined ? { syncMode: body.syncMode ?? null } : {}),
        ...(nextConnection !== undefined ? { connectionJson: toJsonInput(nextConnection) } : {}),
        ...(body.mapping !== undefined ? { mappingJson: toJsonInput(body.mapping ?? null) } : {}),
        ...(body.capabilities !== undefined ? { capabilitiesJson: toJsonInput(body.capabilities ?? null) } : {}),
      },
    });

    return { success: true };
  }

  @Post(':id/test-connection')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Проверка соединения (MVP: безопасная заглушка)' })
  async testConnection(@Param('id') id: string) {
    const it = await this.prisma.supplierIntegration.findUnique({ where: { id } });
    if (!it) throw new NotFoundException('Integration not found');

    const conn = (it.connectionJson ?? null) as null | { endpointUrl?: string | null };
    const hasEndpoint = Boolean(conn?.endpointUrl && String(conn.endpointUrl).trim().length > 0);

    // MVP: не делаем реальный сетевой запрос — только проверяем заполненность.
    return {
      success: hasEndpoint,
      message: hasEndpoint ? 'Endpoint URL задан — базовая проверка пройдена' : 'Endpoint URL не задан',
    };
  }

  @Post(':id/run-sync')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Запуск синхронизации (MVP: записать run и завершить)' })
  async runSync(@Param('id') id: string) {
    const it = await this.prisma.supplierIntegration.findUnique({ where: { id } });
    if (!it) throw new NotFoundException('Integration not found');

    const run = await this.prisma.supplierIntegrationRun.create({
      data: {
        integrationId: id,
        status: 'COMPLETED',
        summary: 'MVP stub run-sync (no-op)',
        finishedAt: new Date(),
        countersJson: { processed: 0, created: 0, updated: 0, errors: 0 },
      },
    });

    await this.prisma.supplierIntegration.update({
      where: { id },
      data: { lastRunSummaryCached: run.summary ?? null, lastSuccessAt: new Date(), consecutiveErrorCount: 0 },
    });

    return { success: true, runId: run.id };
  }

  @Get(':id/runs')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'История запусков интеграции' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async runs(@Param('id') id: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const pg = parsePagination({ page, limit: pageSize });
    const where: Prisma.SupplierIntegrationRunWhereInput = { integrationId: id };

    const [items, total] = await Promise.all([
      this.prisma.supplierIntegrationRun.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.supplierIntegrationRun.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id,
        status: r.status,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
        summary: r.summary ?? null,
        counters: (r.countersJson ?? null) as Record<string, number> | null,
      })),
      total,
    };
  }

  @Get(':id/issues')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Список issues интеграции' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async issues(@Param('id') id: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const pg = parsePagination({ page, limit: pageSize });
    const where: Prisma.SupplierIntegrationIssueWhereInput = { integrationId: id };

    const [items, total] = await Promise.all([
      this.prisma.supplierIntegrationIssue.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { updatedAt: 'desc' }],
        ...paginationArgs(pg),
      }),
      this.prisma.supplierIntegrationIssue.count({ where }),
    ]);

    return {
      items: items.map((i) => ({
        id: i.id,
        entityType: i.entityType ?? null,
        severity: i.severity,
        code: i.code ?? null,
        title: i.title,
        resolutionStatus: i.resolutionStatus ?? null,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
      total,
    };
  }
}

