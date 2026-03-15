import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { SupplierLedgerService } from '../ledger/supplier-ledger.service';
import { AuditInterceptor } from './audit.interceptor';

class UpdatePayoutStatusDto {
  status!: 'NEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  adminComment?: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/payouts')
export class AdminPayoutsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: SupplierLedgerService,
  ) {}

  /**
   * Список заявок на вывод средств.
   */
  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Заявки на вывод средств (постранично)' })
  async list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ page, limit });
    const where: Prisma.SupplierPayoutRequestWhereInput = {};

    if (status) {
      where.status = status;
    }

    const [rawItems, total] = await Promise.all([
      this.prisma.supplierPayoutRequest.findMany({
        where,
        include: {
          operator: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { requestedAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.supplierPayoutRequest.count({ where }),
    ]);

    return buildPaginatedResult(rawItems, total, pg.limit);
  }

  /**
   * Обновить статус заявки на вывод.
   *
   * При установке статуса PAID создаётся проводка PAYOUT в книге поставщика.
   */
  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Обновить статус заявки на вывод средств' })
  async updateStatus(@Param('id') id: string, @Body() body: UpdatePayoutStatusDto) {
    const allowedStatuses: UpdatePayoutStatusDto['status'][] = ['NEW', 'APPROVED', 'REJECTED', 'PAID'];
    if (!allowedStatuses.includes(body.status)) {
      throw new BadRequestException('Некорректный статус выплаты');
    }

    const existing = await this.prisma.supplierPayoutRequest.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new BadRequestException('Заявка не найдена');
    }

    if (existing.isBlockedByDispute) {
      throw new BadRequestException('Выплата заблокирована из-за открытого спора по отчёту');
    }

    // Простой сценарий: только смена статуса (без проводки)
    if (body.status !== 'PAID') {
      return this.prisma.supplierPayoutRequest.update({
        where: { id },
        data: {
          status: body.status,
          adminComment: body.adminComment ?? existing.adminComment,
          processedAt: body.status === 'REJECTED' ? new Date() : existing.processedAt,
        },
      });
    }

    // Статус PAID: делаем в транзакции вместе с проводкой PAYOUT.
    return this.prisma.$transaction(async (tx) => {
      // Пересчитываем доступный баланс на момент выплаты.
      const ledgerAgg = await tx.supplierLedgerEntry.aggregate({
        where: { operatorId: existing.operatorId },
        _sum: { amount: true },
      });
      const currentBalance = Number(ledgerAgg._sum.amount || 0);
      const amount = Number(existing.amount);

      if (amount > currentBalance) {
        throw new BadRequestException('Недостаточно средств на балансе поставщика для выплаты');
      }

      const updated = await tx.supplierPayoutRequest.update({
        where: { id: existing.id },
        data: {
          status: 'PAID',
          processedAt: new Date(),
          adminComment: body.adminComment ?? existing.adminComment,
        },
      });

      // Записываем PAYOUT с отрицательной суммой (в рублях) — в той же транзакции.
      await this.ledger.recordPayoutWithTx(
        tx,
        existing.operatorId,
        -Math.abs(amount),
        'PAYOUT',
        updated.id,
        body.adminComment ?? undefined,
      );

      return updated;
    });
  }
}

