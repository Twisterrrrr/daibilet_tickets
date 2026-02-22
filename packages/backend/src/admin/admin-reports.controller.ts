import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import type { AdminAuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_REPORTS } from '../queue/queue.constants';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_REPORTS) private readonly reportsQueue: Queue,
  ) {}

  @Get('runs')
  @Roles('ADMIN', 'EDITOR')
  async listRuns(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit = '20',
  ) {
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    return this.prisma.reportRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit, 10) || 20, 100),
    });
  }

  @Post('runs')
  @Roles('ADMIN', 'EDITOR')
  async createRun(
    @Req() req: { user: AdminAuthUser },
    @Body()
    body: {
      type: string;
      periodFrom: string;
      periodTo: string;
      operatorId?: string;
      supplierId?: string;
      sendToEmail?: string;
    },
  ) {
    const run = await this.prisma.reportRun.create({
      data: {
        type: body.type as 'SALES' | 'REFUNDS' | 'COMMISSIONS' | 'VOUCHER_REGISTER' | 'EVENTS_OVERVIEW' | 'USAGE_REPORT' | 'SETTLEMENT_ACT',
        status: 'QUEUED',
        requestedByAdminId: req.user.userId,
        operatorId: body.operatorId ?? null,
        supplierId: body.supplierId ?? null,
        params: {
          periodFrom: body.periodFrom,
          periodTo: body.periodTo,
        },
        sendToEmail: body.sendToEmail ?? null,
      },
    });

    await this.reportsQueue.add('report-run', { reportRunId: run.id });
    return run;
  }
}
