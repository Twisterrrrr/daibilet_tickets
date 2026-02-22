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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import {
  CreateTariffCategoryDto,
  CreateTicketPriceDto,
  CreateTicketQuotaDefaultDto,
  UpdateTariffCategoryDto,
  UpdateTicketPriceDto,
  UpdateTicketQuotaDefaultDto,
} from './dto/admin-tariff.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/offers')
export class AdminTariffController {
  constructor(private readonly prisma: PrismaService) {}

  // ─── TariffCategory ───────────────────────────────────────────────

  @Get(':offerId/categories')
  async listCategories(@Param('offerId') offerId: string) {
    await this.ensureOffer(offerId);
    return this.prisma.tariffCategory.findMany({
      where: { offerId },
      include: {
        prices: { where: { status: 'ACTIVE', validTo: null }, take: 1 },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Post(':offerId/categories')
  @Roles('ADMIN', 'EDITOR')
  async createCategory(@Param('offerId') offerId: string, @Body() dto: CreateTariffCategoryDto) {
    await this.ensureOffer(offerId);
    const existing = await this.prisma.tariffCategory.findUnique({
      where: { offerId_code: { offerId, code: dto.code } },
    });
    if (existing) throw new BadRequestException(`Category with code ${dto.code} already exists`);
    return this.prisma.tariffCategory.create({
      data: {
        offerId,
        code: dto.code,
        title: dto.title,
        description: dto.description ?? null,
        kind: dto.kind ?? 'PRIMARY',
        allowedDays: dto.allowedDays ?? [],
        isActive: dto.isActive ?? true,
        isDefaultForCard: dto.isDefaultForCard ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Patch(':offerId/categories/:categoryId')
  @Roles('ADMIN', 'EDITOR')
  async updateCategory(
    @Param('offerId') offerId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateTariffCategoryDto,
  ) {
    await this.ensureCategory(offerId, categoryId);
    return this.prisma.tariffCategory.update({
      where: { id: categoryId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.kind !== undefined && { kind: dto.kind }),
        ...(dto.allowedDays !== undefined && { allowedDays: dto.allowedDays }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.isDefaultForCard !== undefined && { isDefaultForCard: dto.isDefaultForCard }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  @Delete(':offerId/categories/:categoryId')
  @Roles('ADMIN', 'EDITOR')
  async deleteCategory(@Param('offerId') offerId: string, @Param('categoryId') categoryId: string) {
    await this.ensureCategory(offerId, categoryId);
    await this.prisma.tariffCategory.delete({ where: { id: categoryId } });
    return { deleted: true };
  }

  // ─── TicketPrice ──────────────────────────────────────────────────

  @Get(':offerId/prices')
  async listPrices(@Param('offerId') offerId: string) {
    await this.ensureOffer(offerId);
    return this.prisma.ticketPrice.findMany({
      where: { offerId },
      include: { category: { select: { id: true, code: true, title: true } } },
      orderBy: [{ category: { sortOrder: 'asc' } }, { validFrom: 'desc' }],
    });
  }

  @Post(':offerId/prices')
  @Roles('ADMIN', 'EDITOR')
  async createPrice(@Param('offerId') offerId: string, @Body() dto: CreateTicketPriceDto) {
    await this.ensureOffer(offerId);
    const cat = await this.prisma.tariffCategory.findFirst({
      where: { id: dto.categoryId, offerId },
    });
    if (!cat) throw new BadRequestException('Category not found or not in this offer');

    // Close current active price if exists (optional: add validTo)
    const active = await this.prisma.ticketPrice.findFirst({
      where: { categoryId: dto.categoryId, status: 'ACTIVE', validTo: null },
    });
    if (active) {
      await this.prisma.ticketPrice.update({
        where: { id: active.id },
        data: { validTo: new Date(), status: 'INACTIVE' },
      });
    }

    return this.prisma.ticketPrice.create({
      data: {
        offerId,
        categoryId: dto.categoryId,
        currency: dto.currency ?? 'RUB',
        priceCents: dto.priceCents,
        compareAtPriceCents: dto.compareAtPriceCents ?? null,
        status: dto.status ?? 'ACTIVE',
      },
      include: { category: { select: { id: true, code: true, title: true } } },
    });
  }

  @Patch(':offerId/prices/:priceId')
  @Roles('ADMIN', 'EDITOR')
  async updatePrice(
    @Param('offerId') offerId: string,
    @Param('priceId') priceId: string,
    @Body() dto: UpdateTicketPriceDto,
  ) {
    const price = await this.prisma.ticketPrice.findFirst({
      where: { id: priceId, offerId },
    });
    if (!price) throw new NotFoundException('TicketPrice not found');
    return this.prisma.ticketPrice.update({
      where: { id: priceId },
      data: {
        ...(dto.priceCents !== undefined && { priceCents: dto.priceCents }),
        ...(dto.compareAtPriceCents !== undefined && { compareAtPriceCents: dto.compareAtPriceCents }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { category: { select: { id: true, code: true, title: true } } },
    });
  }

  @Delete(':offerId/prices/:priceId')
  @Roles('ADMIN', 'EDITOR')
  async deletePrice(@Param('offerId') offerId: string, @Param('priceId') priceId: string) {
    const price = await this.prisma.ticketPrice.findFirst({
      where: { id: priceId, offerId },
    });
    if (!price) throw new NotFoundException('TicketPrice not found');
    await this.prisma.ticketPrice.update({
      where: { id: priceId },
      data: { validTo: new Date(), status: 'INACTIVE' },
    });
    return { deleted: true };
  }

  // ─── TicketQuotaDefault ───────────────────────────────────────────

  @Get(':offerId/quotas')
  async listQuotaDefaults(@Param('offerId') offerId: string) {
    await this.ensureOffer(offerId);
    return this.prisma.ticketQuotaDefault.findMany({
      where: { offerId },
      include: { category: { select: { id: true, code: true, title: true } } },
    });
  }

  @Post(':offerId/quotas')
  @Roles('ADMIN', 'EDITOR')
  async createQuotaDefault(@Param('offerId') offerId: string, @Body() dto: CreateTicketQuotaDefaultDto) {
    await this.ensureOffer(offerId);
    if (dto.categoryId) {
      const cat = await this.prisma.tariffCategory.findFirst({
        where: { id: dto.categoryId, offerId },
      });
      if (!cat) throw new BadRequestException('Category not found');
    }
    const existing = await this.prisma.ticketQuotaDefault.findUnique({
      where: { offerId_categoryId: { offerId, categoryId: dto.categoryId ?? null } },
    });
    if (existing) throw new BadRequestException('Quota for this category already exists');
    return this.prisma.ticketQuotaDefault.create({
      data: {
        offerId,
        categoryId: dto.categoryId ?? null,
        capacityTotal: dto.capacityTotal ?? null,
        isActive: dto.isActive ?? true,
      },
      include: { category: { select: { id: true, code: true, title: true } } },
    });
  }

  @Patch(':offerId/quotas/:quotaId')
  @Roles('ADMIN', 'EDITOR')
  async updateQuotaDefault(
    @Param('offerId') offerId: string,
    @Param('quotaId') quotaId: string,
    @Body() dto: UpdateTicketQuotaDefaultDto,
  ) {
    const q = await this.prisma.ticketQuotaDefault.findFirst({
      where: { id: quotaId, offerId },
    });
    if (!q) throw new NotFoundException('TicketQuotaDefault not found');
    return this.prisma.ticketQuotaDefault.update({
      where: { id: quotaId },
      data: {
        ...(dto.capacityTotal !== undefined && { capacityTotal: dto.capacityTotal }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { category: { select: { id: true, code: true, title: true } } },
    });
  }

  @Delete(':offerId/quotas/:quotaId')
  @Roles('ADMIN', 'EDITOR')
  async deleteQuotaDefault(@Param('offerId') offerId: string, @Param('quotaId') quotaId: string) {
    const q = await this.prisma.ticketQuotaDefault.findFirst({
      where: { id: quotaId, offerId },
    });
    if (!q) throw new NotFoundException('TicketQuotaDefault not found');
    await this.prisma.ticketQuotaDefault.delete({ where: { id: quotaId } });
    return { deleted: true };
  }

  private async ensureOffer(offerId: string) {
    const o = await this.prisma.eventOffer.findUnique({ where: { id: offerId } });
    if (!o) throw new NotFoundException('EventOffer not found');
  }

  private async ensureCategory(offerId: string, categoryId: string) {
    const c = await this.prisma.tariffCategory.findFirst({
      where: { id: categoryId, offerId },
    });
    if (!c) throw new NotFoundException('TariffCategory not found');
  }

  private async ensureSession(sessionId: string) {
    const s = await this.prisma.eventSession.findUnique({ where: { id: sessionId } });
    if (!s) throw new NotFoundException('EventSession not found');
  }
}
