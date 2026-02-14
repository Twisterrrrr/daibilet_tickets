import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, UseInterceptors, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { parsePagination, paginationArgs, buildPaginatedResult } from '../common/pagination';
import { UpdateSupplierDto, CreateApiKeyDto, UpdateWebhookDto } from './dto/admin-supplier.dto';
import * as crypto from 'crypto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/suppliers')
export class AdminSuppliersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Список поставщиков.
   */
  @Get()
  async list(
    @Query('search') search?: string,
    @Query('trustLevel') trustLevel?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit });
    const where: any = { isSupplier: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { inn: { contains: search } },
      ];
    }
    if (trustLevel !== undefined) where.trustLevel = Number(trustLevel);

    const [rawItems, total] = await Promise.all([
      this.prisma.operator.findMany({
        where,
        include: {
          _count: { select: { events: true, offers: true, supplierUsers: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.operator.count({ where }),
    ]);

    return buildPaginatedResult(rawItems, total, pg.limit);
  }

  /**
   * Детали поставщика.
   */
  @Get(':id')
  async getSupplier(@Param('id') id: string) {
    const supplier = await this.prisma.operator.findUnique({
      where: { id },
      include: {
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
    };
  }

  /**
   * Обновить поставщика (комиссия, trust level, промо).
   */
  @Patch(':id')
  @Roles('ADMIN')
  async updateSupplier(@Param('id') id: string, @Body() data: UpdateSupplierDto) {
    const supplier = await this.prisma.operator.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Поставщик не найден');

    const updateData: any = {};
    if (data.trustLevel !== undefined) updateData.trustLevel = Number(data.trustLevel);
    if (data.commissionRate !== undefined) updateData.commissionRate = Number(data.commissionRate);
    if (data.promoRate !== undefined) updateData.promoRate = data.promoRate ? Number(data.promoRate) : null;
    if (data.promoUntil !== undefined) updateData.promoUntil = data.promoUntil ? new Date(data.promoUntil) : null;
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
    if (data.yookassaAccountId !== undefined) updateData.yookassaAccountId = data.yookassaAccountId || null;
    if (data.verifiedAt !== undefined) updateData.verifiedAt = data.verifiedAt ? new Date() : null;

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

    const updateData: any = {};
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
    const topSupplierIds = topByRevenue
      .map((t) => t.supplierId)
      .filter(Boolean) as string[];
    const topSupplierNames = topSupplierIds.length > 0
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
}
