import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PromoType, Prisma } from '@/prisma-client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { parsePagination, paginationArgs, buildPaginatedResult } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from './dto/admin-promo-code.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/promo-codes')
export class AdminPromoCodesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Список промокодов' })
  async list(
    @Query('search') search?: string,
    @Query('operatorId') operatorId?: string,
    @Query('type') type?: PromoType,
    @Query('isActive') isActive?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit });
    const where: Prisma.PromoCodeWhereInput = {};

    if (search?.trim()) {
      where.code = { contains: search.trim(), mode: 'insensitive' };
    }
    if (operatorId) {
      where.operatorId = operatorId;
    }
    if (type) {
      where.type = type;
    }
    if (isActive != null) {
      if (isActive === 'true') where.isActive = true;
      if (isActive === 'false') where.isActive = false;
    }

    const [items, total] = await Promise.all([
      this.prisma.promoCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.promoCode.count({ where }),
    ]);

    return buildPaginatedResult(items, total, pg.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить промокод по id' })
  getById(@Param('id') id: string) {
    return this.prisma.promoCode.findUniqueOrThrow({ where: { id } });
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Создать промокод' })
  async create(@Body() body: CreatePromoCodeDto) {
    const data: Prisma.PromoCodeCreateInput = {
      code: body.code.trim(),
      type: body.type,
      value: body.value,
      operator: body.operatorId ? { connect: { id: body.operatorId } } : undefined,
      event: body.eventId ? { connect: { id: body.eventId } } : undefined,
      validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
      validTo: body.validTo ? new Date(body.validTo) : undefined,
      maxUses: body.maxUses,
      isActive: body.isActive ?? true,
    };
    const promo = await this.prisma.promoCode.create({ data });
    await this.audit.log(
      'system',
      'CREATE',
      'PromoCode',
      promo.id,
      null,
      promo,
    );
    return promo;
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Обновить промокод' })
  async update(@Param('id') id: string, @Body() body: UpdatePromoCodeDto) {
    const existing = await this.prisma.promoCode.findUniqueOrThrow({ where: { id } });
    const data: Prisma.PromoCodeUpdateInput = {
      code: body.code ? body.code.trim() : undefined,
      type: body.type ?? undefined,
      value: body.value ?? undefined,
      operator: body.operatorId
        ? { connect: { id: body.operatorId } }
        : body.operatorId === null
          ? { disconnect: true }
          : undefined,
      event: body.eventId
        ? { connect: { id: body.eventId } }
        : body.eventId === null
          ? { disconnect: true }
          : undefined,
      validFrom: body.validFrom ? new Date(body.validFrom) : body.validFrom === null ? null : undefined,
      validTo: body.validTo ? new Date(body.validTo) : body.validTo === null ? null : undefined,
      maxUses: body.maxUses ?? undefined,
      isActive: body.isActive ?? undefined,
    };
    const updated = await this.prisma.promoCode.update({ where: { id }, data });
    await this.audit.log(
      'system',
      'UPDATE',
      'PromoCode',
      id,
      existing,
      updated,
    );
    return updated;
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Удалить промокод' })
  async remove(@Param('id') id: string) {
    const existing = await this.prisma.promoCode.findUniqueOrThrow({ where: { id } });
    await this.prisma.promoCode.delete({ where: { id } });
    await this.audit.log(
      'system',
      'DELETE',
      'PromoCode',
      id,
      existing,
      null,
    );
    return { status: 'deleted' };
  }
}

