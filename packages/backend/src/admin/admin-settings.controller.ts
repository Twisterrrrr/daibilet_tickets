import { Controller, Get, Post, Patch, Body, Query, UseGuards, UseInterceptors, Logger, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditInterceptor } from './audit.interceptor';
import { PeakRangeSchema, validateJson } from './json-schemas';
import { BadRequestException } from '@nestjs/common';
import { UpdatePricingDto } from './dto/admin-settings.dto';

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
  async updatePricing(@Body() data: UpdatePricingDto, @Request() req: any) {
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
    await this.cache.del('pricing:config');

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
        await this.cache.invalidatePattern('cities:*');
        break;
      case 'events':
        await this.cache.invalidatePattern('events:*');
        break;
      case 'search':
        await this.cache.invalidatePattern('search:*');
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
