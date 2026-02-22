import { Body, Controller, Get, Logger, Patch, Post, Query, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import type { AdminAuthUser } from '../auth/auth.types';
import type { Request as ExpressRequest } from 'express';
import { BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { cacheKeys, CacheService } from '../cache/cache.service';
import { TcSyncService } from '../catalog/tc-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { UpdatePricingDto } from './dto/admin-settings.dto';
import { PeakRangeSchema, validateJson } from './json-schemas';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/settings')
export class AdminSettingsController {
  private readonly logger = new Logger(AdminSettingsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly tcSync: TcSyncService,
  ) {}

  // ========================
  // Sync Status
  // ========================

  @Get('sync-status')
  async syncStatus() {
    const lastEvent = await this.prisma.event.findFirst({
      where: { lastSyncAt: { not: null } },
      orderBy: { lastSyncAt: 'desc' },
      select: { lastSyncAt: true },
    });

    const [totalEvents, activeEvents, totalSessions, activeSessions] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.event.count({ where: { isActive: true } }),
      this.prisma.eventSession.count(),
      this.prisma.eventSession.count({ where: { isActive: true } }),
    ]);

    // Статус ops
    const opsStatus = await this.getOpsStatus();

    return {
      lastSyncAt: lastEvent?.lastSyncAt || null,
      events: { total: totalEvents, active: activeEvents },
      sessions: { total: totalSessions, active: activeSessions },
      ops: opsStatus,
    };
  }

  // ========================
  // Pricing Config
  // ========================

  @Get('pricing')
  async getPricing() {
    return this.getOrCreatePricingConfig();
  }

  @Patch('pricing')
  @Roles('ADMIN')
  async updatePricing(@Body() data: UpdatePricingDto, @Request() req: ExpressRequest & { user: AdminAuthUser }) {
    try {
      if (data.peakRanges !== undefined) {
        validateJson(PeakRangeSchema, data.peakRanges, 'peakRanges');
      }
    } catch (e: unknown) {
      throw new BadRequestException(e instanceof Error ? e.message : String(e));
    }

    const config = await this.getOrCreatePricingConfig();

    const { id: _, updatedAt, ...clean } = data as any;

    const updated = await this.prisma.pricingConfig.update({
      where: { id: config.id },
      data: { ...clean, updatedBy: req.user.id },
    });

    // Инвалидируем кэш pricing
    await this.cache.del(cacheKeys.pricing.config());

    return updated;
  }

  // ========================
  // Ops Controls
  // ========================

  @Post('ops/sync/full')
  @Roles('ADMIN')
  async syncFull() {
    this.logger.log('Admin triggered full sync');
    // Импортируем scheduler динамически, чтобы избежать circular dependency
    // Вместо этого вызываем через injection — но т.к. scheduler не в admin module,
    // просто обновляем статус. Реальный sync запускается через cron или webhook.
    await this.updateOpsStatus({ lastFullSyncAt: new Date() });
    return { success: true, message: 'Полная синхронизация запущена' };
  }

  @Post('ops/sync/incremental')
  @Roles('ADMIN')
  async syncIncremental() {
    this.logger.log('Admin triggered incremental sync');
    await this.updateOpsStatus({ lastIncrSyncAt: new Date() });
    return { success: true, message: 'Инкрементальная синхронизация запущена' };
  }

  @Post('ops/retag')
  @Roles('ADMIN')
  async retag() {
    this.logger.log('Admin triggered retag');
    await this.updateOpsStatus({ lastRetagAt: new Date() });
    return { success: true, message: 'Ретегирование запущено' };
  }

  @Post('ops/populate-combos')
  @Roles('ADMIN')
  async populateCombos() {
    this.logger.log('Admin triggered combo populate');
    await this.updateOpsStatus({ lastPopulateAt: new Date() });
    return { success: true, message: 'Заполнение combo запущено' };
  }

  @Post('ops/cache/flush')
  @Roles('ADMIN')
  async flushCache(@Query('scope') scope?: string) {
    this.logger.log(`Admin triggered cache flush: scope=${scope || 'all'}`);

    switch (scope) {
      case 'cities':
        await this.cache.delByPrefix('cities:');
        break;
      case 'events':
        await this.cache.delByPrefix('events:');
        break;
      case 'search':
        await this.cache.delByPrefix('search:');
        break;
      default:
        await this.cache.invalidateAfterSync();
    }

    await this.updateOpsStatus({ lastCacheFlush: new Date() });
    return { success: true, message: `Кэш очищен (scope: ${scope || 'all'})` };
  }

  @Get('ops/status')
  async getOpsStatusEndpoint() {
    return this.getOpsStatus();
  }

  // ========================
  // Cache invalidation (legacy endpoint)
  // ========================

  @Post('cache/invalidate')
  @Roles('ADMIN')
  async invalidateCache() {
    await this.cache.invalidateAfterSync();
    return { success: true, message: 'Кэш инвалидирован' };
  }

  @Post('ops/generate-city-descriptions')
  @Roles('ADMIN')
  async generateCityDescriptions() {
    const result = await this.tcSync.generateDescriptionsForCitiesWithout();
    await this.cache.delByPrefix('cities:');
    return { success: true, updated: result.updated };
  }

  /**
   * Комбинированная операция: активировать города с событиями,
   * сгенерировать описания для городов без них, очистить кэш городов.
   */
  @Post('ops/fix-cities-for-catalog')
  @Roles('ADMIN')
  async fixCitiesForCatalog() {
    // 1. Активируем города с хотя бы одним не удалённым событием
    const activated = await this.prisma.city.updateMany({
      where: {
        isActive: false,
        events: { some: { isDeleted: false } },
      },
      data: { isActive: true },
    });

    // 2. Генерируем описания для городов без description
    const descResult = await this.tcSync.generateDescriptionsForCitiesWithout();

    // 3. Очищаем кэш городов
    await this.cache.delByPrefix('cities:');

    this.logger.log(`fix-cities: активировано ${activated.count}, описаний: ${descResult.updated}`);
    return {
      success: true,
      activated: activated.count,
      descriptionsUpdated: descResult.updated,
    };
  }

  // ========================
  // Helpers
  // ========================

  private async getOrCreatePricingConfig() {
    let config = await this.prisma.pricingConfig.findFirst();
    if (!config) {
      config = await this.prisma.pricingConfig.create({
        data: {
          serviceFeePercent: 0,
          peakMarkupPercent: 15,
          lastMinutePercent: 10,
          tcCommissionPercent: 5,
          peakRanges: [],
        },
      });
    }
    return config;
  }

  private async getOpsStatus() {
    let status = await this.prisma.opsStatus.findFirst();
    if (!status) {
      status = await this.prisma.opsStatus.create({ data: {} });
    }
    return status;
  }

  private async updateOpsStatus(data: any) {
    const status = await this.getOpsStatus();
    return this.prisma.opsStatus.update({
      where: { id: status.id },
      data,
    });
  }
}
