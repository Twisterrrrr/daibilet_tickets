import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Prisma } from '@/prisma-client';
import { SupplierLegalProfileStatus } from '@/prisma-client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { UpdateLegalProfileStatusDto } from './dto/admin-finance.dto';

const STATUS_FILTER: SupplierLegalProfileStatus[] = ['DRAFT', 'INCOMPLETE', 'VERIFIED', 'REJECTED'];

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/finance/suppliers/profiles')
export class AdminFinanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Список юридических профилей поставщиков с фильтром по статусу' })
  async list(
    @Query('status') status?: SupplierLegalProfileStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ page, limit });
    const where: { status?: SupplierLegalProfileStatus } = {};
    if (status && STATUS_FILTER.includes(status)) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.supplierLegalProfile.findMany({
        where,
        include: {
          operator: { select: { id: true, name: true, slug: true } },
          bankAccounts: { select: { id: true, isPrimary: true, bankName: true, accountNumber: true } },
        },
        orderBy: { updatedAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.supplierLegalProfile.count({ where }),
    ]);

    return buildPaginatedResult(items, total, pg.limit);
  }

  @Get(':operatorId')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Детализация юридического профиля и все счета оператора' })
  async getByOperatorId(@Param('operatorId') operatorId: string) {
    const profile = await this.prisma.supplierLegalProfile.findUnique({
      where: { operatorId },
      include: {
        operator: { select: { id: true, name: true, slug: true } },
        bankAccounts: true,
      },
    });

    if (!profile) {
      return null;
    }

    return profile;
  }

  @Patch(':operatorId/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Смена статуса профиля (VERIFIED / REJECTED)' })
  async updateStatus(
    @Param('operatorId') operatorId: string,
    @Req() req: { user: { id: string } },
    @Body() body: UpdateLegalProfileStatusDto,
  ) {
    if (body.status === 'REJECTED' && (!body.comment || !body.comment.trim())) {
      throw new BadRequestException('Причина отказа обязательна при отклонении профиля');
    }

    const profile = await this.prisma.supplierLegalProfile.findUnique({
      where: { operatorId },
    });

    if (!profile) {
      throw new BadRequestException('Профиль не найден');
    }

    const existingMeta = (profile.metaJson as Prisma.JsonObject | null) ?? {};
    const history: Prisma.InputJsonValue[] = Array.isArray(existingMeta.history)
      ? ([...existingMeta.history] as Prisma.InputJsonValue[])
      : [];

    const historyEntry = {
      status: body.status,
      changedAt: new Date().toISOString(),
      changedByAdminId: req.user.id,
      ...(body.status === 'REJECTED' && body.comment ? { comment: body.comment.trim() } : {}),
    } as Prisma.InputJsonValue;
    history.push(historyEntry);
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    const metaJson = {
      ...(existingMeta as Record<string, unknown>),
      history,
    } as Prisma.InputJsonValue;

    if (body.status === 'VERIFIED') {
      return this.prisma.supplierLegalProfile.update({
        where: { operatorId },
        data: {
          status: 'VERIFIED',
          verifiedBy: req.user.id,
          verifiedAt: new Date(),
          rejectionComment: null,
          metaJson,
        },
        include: { operator: { select: { id: true, name: true, slug: true } }, bankAccounts: true },
      });
    }

    return this.prisma.supplierLegalProfile.update({
      where: { operatorId },
      data: {
        status: 'REJECTED',
        verifiedBy: null,
        verifiedAt: null,
        rejectionComment: body.comment?.trim() ?? null,
        metaJson,
      },
      include: { operator: { select: { id: true, name: true, slug: true } }, bankAccounts: true },
    });
  }

}
