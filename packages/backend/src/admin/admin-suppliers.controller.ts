import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as crypto from 'crypto';

import { Prisma, SupplierRole } from '@/prisma-client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import {
  CreateApiKeyDto,
  UpdateSupplierDto,
  UpdateWebhookDto,
  UpdateSupplierUserRoleDto,
  UpdateOperatorPaymentSettingsDto,
} from './dto/admin.dto';
import { SetTrustOverrideDto } from './dto/admin-supplier.dto';
import { AuditService } from './audit.service';
import { SupplierTrustService } from '../supplier/supplier-trust.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/suppliers')
export class AdminSuppliersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly supplierTrust: SupplierTrustService,
  ) {}

  /**
   * Список поставщиков.
   */
  @Get()
  async list(
    @Query('search') search?: string,
    @Query('trustLevel') trustLevel?: string,
    @Query('isActive') isActive?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit });
    const where: Prisma.OperatorWhereInput = { isSupplier: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { inn: { contains: search } },
      ];
    }
    if (trustLevel !== undefined) {
      const tl = Number(trustLevel);
      if (!Number.isNaN(tl)) {
        where.trustLevel = tl;
      }
    }
    if (isActive === 'true') {
      where.isActive = true;
    } else if (isActive === 'false') {
      where.isActive = false;
    }

    const [rawItems, total, eventsBySourceRaw] = await Promise.all([
      this.prisma.operator.findMany({
        where,
        include: {
          _count: { select: { events: true, offers: true, supplierUsers: true } },
          supplierTrustOverride: true,
        },
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.operator.count({ where }),
      this.prisma.event.groupBy({
        by: ['source'],
        where: { isDeleted: false },
        _count: { id: true },
      }),
    ]);

    const eventCountsBySource = eventsBySourceRaw.reduce(
      (acc, row) => {
        acc[row.source] = row._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    const now = new Date();
    const itemsForPage = rawItems.map((r) => {
      const { supplierTrustOverride, ...rest } = r;
      return {
        ...rest,
        effectiveTrustScore: this.supplierTrust.getEffectiveScore(r),
        trustOverrideActive: !!(supplierTrustOverride && supplierTrustOverride.expiresAt > now),
      };
    });

    return {
      ...buildPaginatedResult(itemsForPage, total, pg.limit),
      eventCountsBySource,
    };
  }

  /**
   * Админ-override trust score (дельта к базовому trustScore).
   */
  @Get(':id/trust-override')
  @Roles('ADMIN')
  async getTrustOverride(@Param('id') id: string) {
    return this.supplierTrust.getTrustOverridePayload(id);
  }

  @Post(':id/trust-override')
  @Roles('ADMIN')
  async setTrustOverride(@Param('id') id: string, @Body() body: SetTrustOverrideDto) {
    const expiresAt = new Date(body.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Некорректная дата expiresAt');
    }
    await this.supplierTrust.upsertTrustOverride(id, {
      scoreDelta: body.scoreDelta,
      reason: body.reason.trim(),
      expiresAt,
    });
    return this.supplierTrust.getTrustOverridePayload(id);
  }

  @Delete(':id/trust-override')
  @Roles('ADMIN')
  async removeTrustOverride(@Param('id') id: string) {
    return this.supplierTrust.deleteTrustOverride(id);
  }

  /**
   * Детали поставщика.
   */
  @Get(':id')
  async getSupplier(@Param('id') id: string) {
    const supplier = await this.prisma.operator.findUnique({
      where: { id },
      include: {
        supplierTrustOverride: true,
        supplierUsers: { select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true } },
        _count: { select: { events: true, offers: true } },
      },
    });
    if (!supplier) throw new NotFoundException('Поставщик не найден');

    // Финансовая сводка
    const payments = await this.prisma.paymentIntent.aggregate({
      where: { supplierId: id, status: 'PAID' },
      _sum: { grossAmount: true, platformFee: true, supplierAmount: true },
      _count: { id: true },
    });

    return {
      ...supplier,
      financials: {
        totalOrders: payments._count.id,
        grossRevenue: payments._sum.grossAmount || 0,
        platformFee: payments._sum.platformFee || 0,
        supplierRevenue: payments._sum.supplierAmount || 0,
      },
      trust: {
        score: supplier.trustScore,
        effectiveScore: this.supplierTrust.getEffectiveScore(supplier),
        level: supplier.trustLevel,
        profile: supplier.trustProfileScore,
        catalog: supplier.trustCatalogScore,
        operations: supplier.trustOperationsScore,
        reputation: supplier.trustReputationScore,
        stability: supplier.trustStabilityScore,
        penalties: supplier.trustPenaltyScore,
        manualOverrideLevel: supplier.trustManualOverrideLevel,
        manualOverrideScore: supplier.trustManualOverrideScore,
        manualOverrideExpiresAt: supplier.trustManualExpiresAt,
        lastCalculatedAt: supplier.trustLastCalculatedAt,
        trustOverride: supplier.supplierTrustOverride
          ? {
              scoreDelta: supplier.supplierTrustOverride.scoreDelta,
              reason: supplier.supplierTrustOverride.reason,
              expiresAt: supplier.supplierTrustOverride.expiresAt.toISOString(),
              createdAt: supplier.supplierTrustOverride.createdAt.toISOString(),
              active: supplier.supplierTrustOverride.expiresAt > new Date(),
            }
          : null,
      },
    };
  }

  /**
   * Изменить роль пользователя поставщика.
   *
   * PATCH /admin/suppliers/:supplierId/users/:userId/role
   */
  @Patch(':supplierId/users/:userId/role')
  @Roles('ADMIN')
  async updateSupplierUserRole(
    @Param('supplierId') supplierId: string,
    @Param('userId') userId: string,
    @Body() body: UpdateSupplierUserRoleDto,
  ) {
    const membership = await this.prisma.supplierUser.findFirst({
      where: { id: userId, operatorId: supplierId },
      select: { id: true, operatorId: true, role: true, isActive: true },
    });
    if (!membership) {
      throw new NotFoundException('Пользователь поставщика не найден');
    }

    if (membership.role === body.role) {
      // Ничего менять не нужно, но вернём актуальное состояние c дополнительными полями.
      const current = await this.prisma.supplierUser.findUnique({
        where: { id: membership.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
        },
      });
      return current;
    }

    // Защита: нельзя снять роль у последнего активного OWNER.
    if (membership.role === SupplierRole.OWNER && body.role !== SupplierRole.OWNER) {
      const activeOwners = await this.prisma.supplierUser.count({
        where: {
          operatorId: supplierId,
          isActive: true,
          role: SupplierRole.OWNER,
        },
      });
      if (activeOwners <= 1) {
        throw new BadRequestException({
          code: 'LAST_OWNER_PROTECTION',
          message: 'Нельзя снять роль у последнего активного OWNER',
        });
      }
    }

    const updated = await this.prisma.supplierUser.update({
      where: { id: membership.id },
      data: { role: body.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
      },
    });
    return updated;
  }

  /**
   * Список событий поставщика (по operatorId в офферах).
   */
  @Get(':id/events')
  async listSupplierEvents(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: 'title' | 'createdAt' | 'nearestSession',
    @Query('dir') dir?: 'asc' | 'desc',
  ) {
    const supplier = await this.prisma.operator.findUnique({ where: { id, isSupplier: true } });
    if (!supplier) throw new NotFoundException('Поставщик не найден');

    const where: Prisma.EventWhereInput = {
      isDeleted: false,
      offers: { some: { operatorId: id } },
    };

    if (search) {
      const trimmed = search.trim();
      if (trimmed) {
        where.OR = [
          { title: { contains: trimmed, mode: 'insensitive' } },
          { slug: { contains: trimmed, mode: 'insensitive' } },
        ];
      }
    }

    const now = new Date();

    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Number(pageSize) || 20);
    const skip = (pageNum - 1) * take;

    const orderBy: Prisma.EventOrderByWithRelationInput =
      sort === 'title'
        ? { title: dir === 'asc' ? 'asc' : 'desc' }
        : sort === 'createdAt'
        ? { createdAt: dir === 'asc' ? 'asc' : 'desc' }
        : { updatedAt: dir === 'asc' ? 'asc' : 'desc' };

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          city: { select: { name: true } },
          sessions: {
            where: { isActive: true, canceledAt: null, startsAt: { gt: now } },
            orderBy: { startsAt: 'asc' },
            take: 1,
          },
          offers: {
            where: { operatorId: id },
            orderBy: [{ isPrimary: 'desc' }, { priority: 'desc' }],
            take: 1,
            include: {
              operator: { select: { id: true, isActive: true } },
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const items = events.map((e) => {
      const primaryOffer = e.offers[0];
      const nearestSession = e.sessions[0];
      const supplierIsActive = primaryOffer?.operator?.isActive ?? true;

      return {
        id: e.id,
        slug: e.slug,
        title: e.title,
        cityName: e.city?.name ?? null,
        source: e.source,
        isActive: e.isActive,
        supplierIsActive,
        sessionsCount: e.sessions.length,
        updatedAt: e.updatedAt,
        nearestSession: nearestSession?.startsAt?.toISOString?.() ?? null,
      };
    });

    return {
      items,
      total,
      page: pageNum,
      pageSize: take,
    };
  }

  /**
   * Обновить поставщика (комиссия, trust level). Промо-поля в БД обнуляются: действует только фиксированная commissionRate.
   */
  @Patch(':id')
  @Roles('ADMIN')
  async updateSupplier(@Param('id') id: string, @Body() data: UpdateSupplierDto) {
    const supplier = await this.prisma.operator.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Поставщик не найден');

    const updateData: Prisma.OperatorUpdateInput = {};
    if (data.trustLevel !== undefined) updateData.trustLevel = Number(data.trustLevel);
    if (data.commissionRate !== undefined) updateData.commissionRate = Number(data.commissionRate);
    updateData.promoRate = null;
    updateData.promoUntil = null;
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
    if (data.isExchangeFrozen !== undefined) {
      updateData.status = data.isExchangeFrozen ? 'SUSPENDED' : 'ACTIVE';
    } else if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.yookassaAccountId !== undefined) updateData.yookassaAccountId = data.yookassaAccountId || null;
    if (data.verifiedAt !== undefined) updateData.verifiedAt = data.verifiedAt ? new Date() : null;
    if (data.defaultRefundPolicyText !== undefined) {
      updateData.defaultRefundPolicyText = data.defaultRefundPolicyText ?? null;
      updateData.defaultRefundPolicyUpdatedAt = new Date();
    }

    return this.prisma.operator.update({ where: { id }, data: updateData });
  }

  // ============================
  // API Keys Management
  // ============================

  /**
   * Сгенерировать API-ключ для поставщика.
   * Plain-text ключ возвращается ОДИН РАЗ.
   */
  @Post(':id/api-keys')
  @Roles('ADMIN')
  async generateApiKey(@Param('id') id: string, @Body() data?: CreateApiKeyDto) {
    const operator = await this.prisma.operator.findUnique({ where: { id } });
    if (!operator) throw new NotFoundException('Поставщик не найден');

    // Генерация ключа: dbl_ + 32 случайных символа
    const rawKey = 'dbl_' + crypto.randomBytes(24).toString('base64url');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.slice(0, 8);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        operatorId: id,
        keyHash,
        prefix,
        name: data?.name || 'default',
        rateLimit: data?.rateLimit || 100,
        ipWhitelist: data?.ipWhitelist || [],
      },
    });

    return {
      id: apiKey.id,
      key: rawKey, // ← показывается ОДИН раз
      prefix,
      name: apiKey.name,
      rateLimit: apiKey.rateLimit,
      message: 'Сохраните ключ — он не будет показан повторно',
    };
  }

  /**
   * Список API-ключей поставщика (без хешей).
   */
  @Get(':id/api-keys')
  async listApiKeys(@Param('id') id: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { operatorId: id },
      select: {
        id: true,
        prefix: true,
        name: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        rateLimit: true,
        ipWhitelist: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return keys;
  }

  /**
   * Отозвать API-ключ.
   */
  @Delete(':id/api-keys/:keyId')
  @Roles('ADMIN')
  async revokeApiKey(@Param('id') id: string, @Param('keyId') keyId: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, operatorId: id },
    });
    if (!key) throw new NotFoundException('API-ключ не найден');

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    return { message: 'API-ключ деактивирован', id: keyId };
  }

  // ============================
  // Webhook Configuration
  // ============================

  /**
   * Настроить webhook URL для поставщика.
   */
  @Patch(':id/webhook')
  @Roles('ADMIN')
  async configureWebhook(@Param('id') id: string, @Body() data: UpdateWebhookDto) {
    const operator = await this.prisma.operator.findUnique({ where: { id } });
    if (!operator) throw new NotFoundException('Поставщик не найден');

    const updateData: Prisma.OperatorUpdateInput = {};
    if (data.webhookUrl !== undefined) {
      updateData.webhookUrl = data.webhookUrl || null;
    }
    if (data.regenerateSecret) {
      updateData.webhookSecret = crypto.randomBytes(32).toString('hex');
    }
    // Если впервые ставим URL и секрета нет — генерируем
    if (data.webhookUrl && !operator.webhookSecret && !data.regenerateSecret) {
      updateData.webhookSecret = crypto.randomBytes(32).toString('hex');
    }

    const updated = await this.prisma.operator.update({
      where: { id },
      data: updateData,
      select: { id: true, webhookUrl: true, webhookSecret: true },
    });

    return {
      webhookUrl: updated.webhookUrl,
      webhookSecret: updated.webhookSecret,
      message: 'Webhook настроен',
    };
  }

  // ============================
  // Analytics
  // ============================

  /**
   * Сводная аналитика по поставщикам.
   */
  @Get('analytics/summary')
  @Roles('ADMIN')
  async analyticsSummary() {
    const [totalSuppliers, byTrustLevel, topByRevenue] = await Promise.all([
      this.prisma.operator.count({ where: { isSupplier: true } }),
      this.prisma.operator.groupBy({
        by: ['trustLevel'],
        where: { isSupplier: true },
        _count: { id: true },
      }),
      this.prisma.paymentIntent.groupBy({
        by: ['supplierId'],
        where: { status: 'PAID', supplierId: { not: null } },
        _sum: { grossAmount: true, platformFee: true },
        _count: { id: true },
        orderBy: { _sum: { grossAmount: 'desc' } },
        take: 10,
      }),
    ]);

    // Enriched top suppliers
    const topSupplierIds = topByRevenue.map((t) => t.supplierId).filter(Boolean) as string[];
    const topSupplierNames =
      topSupplierIds.length > 0
        ? await this.prisma.operator.findMany({
            where: { id: { in: topSupplierIds } },
            select: { id: true, name: true },
          })
        : [];
    const nameMap = new Map(topSupplierNames.map((s) => [s.id, s.name]));

    return {
      totalSuppliers,
      byTrustLevel: byTrustLevel.map((t) => ({
        level: t.trustLevel,
        count: t._count.id,
      })),
      topByRevenue: topByRevenue.map((t) => ({
        supplierId: t.supplierId,
        supplierName: nameMap.get(t.supplierId!) || 'Unknown',
        totalOrders: t._count.id,
        grossRevenue: t._sum.grossAmount || 0,
        platformFee: t._sum.platformFee || 0,
      })),
    };
  }

  // ============================
  // Payment settings (P3.2)
  // ============================

  @Get(':id/payment-settings')
  @Roles('ADMIN')
  async getPaymentSettings(@Param('id') id: string) {
    const operator = await this.prisma.operator.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        paymentMode: true,
        agentSchemeEnabled: true,
        splitEnabled: true,
        pspFeeMode: true,
      },
    });
    if (!operator) {
      throw new NotFoundException('Поставщик не найден');
    }
    return operator;
  }

  @Patch(':id/payment-settings')
  @Roles('ADMIN')
  async updatePaymentSettings(
    @Param('id') id: string,
    @Body() dto: UpdateOperatorPaymentSettingsDto,
    @Req() req: { user: { id: string } },
  ) {
    const operator = await this.prisma.operator.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        yookassaAccountId: true,
        paymentMode: true,
        agentSchemeEnabled: true,
        splitEnabled: true,
        pspFeeMode: true,
      },
    });
    if (!operator) {
      throw new NotFoundException('Поставщик не найден');
    }

    const before = {
      paymentMode: operator.paymentMode,
      agentSchemeEnabled: operator.agentSchemeEnabled,
      splitEnabled: operator.splitEnabled,
      pspFeeMode: operator.pspFeeMode,
    };

    const data: Prisma.OperatorUpdateInput = {};
    if (dto.paymentMode !== undefined) {
      data.paymentMode = dto.paymentMode;
    }
    if (dto.agentSchemeEnabled !== undefined) {
      data.agentSchemeEnabled = dto.agentSchemeEnabled;
    }
    if (dto.splitEnabled !== undefined) {
      if (dto.splitEnabled && !operator.yookassaAccountId) {
        throw new BadRequestException('Нельзя включить splitEnabled без yookassaAccountId у оператора');
      }
      data.splitEnabled = dto.splitEnabled;
    }
    if (dto.pspFeeMode !== undefined) {
      data.pspFeeMode = dto.pspFeeMode;
    }

    const updated = await this.prisma.operator.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        paymentMode: true,
        agentSchemeEnabled: true,
        splitEnabled: true,
        pspFeeMode: true,
      },
    });

    await this.audit.log(
      req.user.id,
      'UPDATE',
      'OperatorPaymentSettings',
      updated.id,
      before as unknown as Prisma.InputJsonValue,
      {
        paymentMode: updated.paymentMode,
        agentSchemeEnabled: updated.agentSchemeEnabled,
        splitEnabled: updated.splitEnabled,
        pspFeeMode: updated.pspFeeMode,
      } as unknown as Prisma.InputJsonValue,
    );

    return updated;
  }
}
