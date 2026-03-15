import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupplierDisputeStatus } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, paginationArgs, buildPaginatedResult } from '../common/pagination';
import { AuditInterceptor } from './audit.interceptor';
import { SupplierDisputeService } from '../supplier-finance/supplier-dispute.service';

const RESOLVE_STATUSES: SupplierDisputeStatus[] = ['RESOLVED', 'REJECTED'];

class ResolveSupplierDisputeDto {
  status!: (typeof RESOLVE_STATUSES)[number];
  resolutionText?: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/supplier-disputes')
export class AdminSupplierDisputesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disputes: SupplierDisputeService,
  ) {}

  @Get()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Список споров поставщиков' })
  async list(
    @Query('status') status?: SupplierDisputeStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ page, limit: limit || '20' });

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.supplierDispute.findMany({
        where,
        include: {
          report: true,
          operator: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.supplierDispute.count({ where }),
    ]);

    return buildPaginatedResult(items, total, pg.limit);
  }

  @Patch(':id/resolve')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Закрыть спор поставщика' })
  async resolve(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
    @Body() body: ResolveSupplierDisputeDto,
  ) {
    if (!RESOLVE_STATUSES.includes(body.status)) {
      throw new Error('Invalid dispute status');
    }

    return this.disputes.resolveDispute({
      disputeId: id,
      resolvedByAdminId: req.user.id,
      status: body.status,
      resolutionText: body.resolutionText,
    });
  }
}

