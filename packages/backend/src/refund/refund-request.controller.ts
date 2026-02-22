import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { parsePagination, buildPaginatedResult, paginationArgs } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { RefundEngineService } from './refund-engine.service';
import { RefundExecutionService } from './refund-execution.service';

@ApiTags('refunds')
@Controller('refunds')
export class RefundRequestController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refundEngine: RefundEngineService,
  ) {}

  @Post()
  async create(
    @Body()
    body: {
      packageId?: string;
      ticketId?: string;
      reason?: string;
      requestedAmountCents?: number;
    },
  ) {
    if (!body.packageId && !body.ticketId) {
      throw new BadRequestException('Provide packageId or ticketId');
    }

    const existing = body.ticketId
      ? await this.prisma.refundRequest.findFirst({
          where: {
            ticketId: body.ticketId,
            status: { in: ['REQUESTED', 'CALCULATED', 'FORWARDED', 'WAITING_PROVIDER', 'APPROVED', 'PROCESSING'] },
          },
        })
      : null;
    if (existing) throw new BadRequestException('Open refund request already exists for this ticket');

    const ticket = body.ticketId
      ? await this.prisma.ticketIssued.findUnique({
          where: { id: body.ticketId },
          include: { offer: true, session: true },
        })
      : null;

    const packageData = body.packageId
      ? await this.prisma.checkoutPackage.findUnique({
          where: { id: body.packageId },
          include: { items: { include: { offer: true, session: true } } } as const,
        })
      : null;

    let policySnapshot: object | null = null;
    let calcSnapshot: object | null = null;
    let paymentMode = 'PLATFORM' as const;
    let provider: 'TEPLOHOD' | 'TICKETS_CLOUD' | 'OTHER' | null = null;
    let packageId: string | null = body.packageId ?? null;
    let ticketId: string | null = body.ticketId ?? null;
    let offerId: string | null = null;
    let sessionId: string | null = null;
    let operatorId: string | null = null;
    let supplierId: string | null = null;
    let sessionStartsAt: Date | null = null;
    let grossCents = 0;
    let platformFeeCents = 0;
    let paymentFeeCents = 0;
    let providerPayableCents = 0;

    if (ticket) {
      policySnapshot = (await this.getPolicyForTicket(ticket.id)) as object | null;
      offerId = ticket.offerId;
      sessionId = ticket.sessionId;
      operatorId = ticket.operatorId;
      supplierId = ticket.supplierId;
      grossCents = ticket.grossCents;
      platformFeeCents = ticket.commissionCents;
      paymentFeeCents = ticket.paymentFeeCents;
      providerPayableCents = ticket.providerPayableCents;
      provider = ticket.provider;
      const sess = ticket.session;
      sessionStartsAt = sess?.startsAt ?? null;
      if (policySnapshot && sessionStartsAt) {
        const calc = this.refundEngine.calculate({
          policySnapshot: policySnapshot as { mode?: string; tiers?: unknown[]; refundFees?: unknown },
          sessionStartsAt,
          grossCents,
          platformFeeCents,
          paymentFeeCents,
          providerPayableCents,
        });
        calcSnapshot = calc.calcSnapshot;
      }
    } else if (packageData) {
      policySnapshot = packageData.cancellationPolicySnapshotJson as object | null;
      const firstItem = packageData.items[0];
      if (firstItem) {
        offerId = firstItem.offerId;
        sessionId = firstItem.sessionId;
        if (firstItem.session) sessionStartsAt = firstItem.session.startsAt;
        const snap = firstItem.itemSnapshot as { totalKopecks?: number } | null;
        grossCents = snap?.totalKopecks ?? packageData.priceSnapshotJson
          ? (packageData.priceSnapshotJson as { totalKopecks?: number }).totalKopecks ?? 0
          : 0;
      }
      if (policySnapshot && sessionStartsAt) {
        const calc = this.refundEngine.calculate({
          policySnapshot: policySnapshot as { mode?: string; tiers?: unknown[]; refundFees?: unknown },
          sessionStartsAt,
          grossCents,
        });
        calcSnapshot = calc.calcSnapshot;
      }
    }

    const rr = await this.prisma.refundRequest.create({
      data: {
        status: calcSnapshot ? 'CALCULATED' : 'REQUESTED',
        paymentMode,
        provider,
        packageId,
        ticketId,
        offerId,
        sessionId,
        operatorId,
        supplierId,
        policySnapshot: policySnapshot as object | undefined,
        calcSnapshot: calcSnapshot as object | undefined,
        requestedAmountCents: body.requestedAmountCents ?? (calcSnapshot as { refundableCents?: number })?.refundableCents ?? null,
        reason: body.reason ?? null,
      },
    });
    return rr;
  }

  private async getPolicyForTicket(ticketId: string): Promise<object | null> {
    const ticket = await this.prisma.ticketIssued.findUnique({
      where: { id: ticketId },
      include: { offer: { include: { cancellationPolicy: true } } },
    });
    if (ticket?.offer?.cancellationPolicy?.ruleJson) {
      return {
        mode: 'TIERED',
        tiers: ((ticket.offer.cancellationPolicy.ruleJson as { tiers?: unknown[] })?.tiers) ?? [],
        refundFees: {},
      };
    }
    const platform = await this.prisma.cancellationPolicyTemplate.findFirst({
      where: { scopeType: 'PLATFORM', scopeId: null, isActive: true },
    });
    return platform?.ruleJson ? (platform.ruleJson as object) : null;
  }
}

@ApiTags('admin/refunds')
@Controller('admin/refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
export class AdminRefundRequestController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refundExecution: RefundExecutionService,
  ) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit });
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.refundRequest.findMany({
        where,
        include: {
          ticket: { select: { id: true, voucherCode: true, grossCents: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.refundRequest.count({ where }),
    ]);
    return buildPaginatedResult(items, total, pg.limit);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const rr = await this.prisma.refundRequest.findUnique({
      where: { id },
      include: { ticket: true },
    });
    if (!rr) throw new NotFoundException('RefundRequest not found');
    return rr;
  }

  @Patch(':id/approve')
  @Roles('ADMIN')
  async approve(@Param('id') id: string, @Body() body: { approvedAmountCents?: number }) {
    const rr = await this.prisma.refundRequest.findUnique({ where: { id } });
    if (!rr) throw new NotFoundException('RefundRequest not found');
    if (!['REQUESTED', 'CALCULATED', 'FORWARDED', 'WAITING_PROVIDER'].includes(rr.status)) {
      throw new BadRequestException(`Cannot approve in status ${rr.status}`);
    }
    const approvedAmount =
      body.approvedAmountCents ??
      rr.requestedAmountCents ??
      (rr.calcSnapshot ? (rr.calcSnapshot as { refundableCents?: number })?.refundableCents ?? null : null);
    await this.prisma.refundRequest.update({
      where: { id },
      data: { status: 'APPROVED', approvedAmountCents: approvedAmount },
    });
    await this.refundExecution.executeOnApprove(id);
    return this.prisma.refundRequest.findUnique({ where: { id } });
  }

  @Patch(':id/reject')
  @Roles('ADMIN')
  async reject(@Param('id') id: string, @Body() body: { comment?: string }) {
    const rr = await this.prisma.refundRequest.findUnique({ where: { id } });
    if (!rr) throw new NotFoundException('RefundRequest not found');
    if (!['REQUESTED', 'CALCULATED', 'FORWARDED', 'WAITING_PROVIDER'].includes(rr.status)) {
      throw new BadRequestException(`Cannot reject in status ${rr.status}`);
    }
    return this.prisma.refundRequest.update({
      where: { id },
      data: { status: 'REJECTED', comment: body.comment ?? rr.comment, closedAt: new Date() },
    });
  }

  @Patch(':id/close')
  @Roles('ADMIN')
  async close(@Param('id') id: string, @Body() body: { comment?: string }) {
    const rr = await this.prisma.refundRequest.findUnique({ where: { id } });
    if (!rr) throw new NotFoundException('RefundRequest not found');
    return this.prisma.refundRequest.update({
      where: { id },
      data: { status: 'CLOSED', comment: body.comment ?? rr.comment, closedAt: new Date() },
    });
  }
}
