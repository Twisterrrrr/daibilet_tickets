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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ExternalRefundRequestReason, ExternalRefundRequestStatus, Prisma } from '@/prisma-client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { parseTicketProviderCodeParam } from './routing/parse-provider-code';
import { CreateExternalRefundRequestDto, PatchExternalRefundRequestDto } from './dto/admin-external-orders.dto';

@ApiTags('admin/external-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR', 'VIEWER')
@Controller('admin')
export class AdminExternalOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('external-orders/:id')
  @ApiOperation({ summary: 'Деталь внешнего заказа (ExternalOrderLink) + операционные заявки' })
  async getExternalOrderDetail(@Param('id') id: string) {
    const row = await this.prisma.externalOrderLink.findUnique({
      where: { id },
      include: {
        tickets: { orderBy: { createdAt: 'asc' } },
        refundRequests: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!row) throw new NotFoundException('Внешний заказ не найден');

    return {
      id: row.id,
      provider: row.provider,
      externalOrderId: row.externalOrderId,
      status: row.status,
      integrationState: row.integrationState,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      lastError: row.lastError ?? null,
      payload: row.payloadJson ?? null,
      checkoutSessionId: row.checkoutSessionId ?? null,
      packageId: row.packageId ?? null,
      packageItemId: row.packageItemId ?? null,
      tickets: row.tickets.map((t) => ({
        id: t.id,
        provider: t.provider,
        externalTicketId: t.externalTicketId,
        createdAt: t.createdAt.toISOString(),
        payload: t.payloadJson ?? null,
      })),
      refundRequests: row.refundRequests.map((r) => ({
        id: r.id,
        externalOrderLinkId: r.externalOrderLinkId,
        status: r.status,
        reason: r.reason,
        reasonNote: r.reasonNote ?? null,
        amount: r.amount ?? null,
        currency: r.currency,
        createdByAdminId: r.createdByAdminId ?? null,
        assignedToAdminId: r.assignedToAdminId ?? null,
        resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }

  @Post('external-orders/:id/refund-requests')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Создать операционную заявку на ручной возврат по внешнему заказу' })
  async createExternalRefundRequest(
    @Param('id') externalOrderId: string,
    @Body() body: CreateExternalRefundRequestDto,
    @Req() req: any,
  ) {
    const order = await this.prisma.externalOrderLink.findUnique({
      where: { id: externalOrderId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Внешний заказ не найден');

    const reason = body.reason ?? ExternalRefundRequestReason.OTHER;
    const status = ExternalRefundRequestStatus.REQUESTED;
    const createdByAdminId: string | undefined = typeof req?.user?.id === 'string' ? req.user.id : undefined;

    const created = await this.prisma.externalRefundRequest.create({
      data: {
        externalOrderLinkId: order.id,
        status,
        reason,
        reasonNote: body.reasonNote?.trim() ? body.reasonNote.trim() : undefined,
        amount: body.amount ?? undefined,
        currency: body.currency?.trim() ? body.currency.trim().toUpperCase() : undefined,
        assignedToAdminId: body.assignedToAdminId ?? undefined,
        createdByAdminId,
      },
    });

    return {
      id: created.id,
      externalOrderLinkId: created.externalOrderLinkId,
      status: created.status,
      reason: created.reason,
      reasonNote: created.reasonNote ?? null,
      amount: created.amount ?? null,
      currency: created.currency,
      createdByAdminId: created.createdByAdminId ?? null,
      assignedToAdminId: created.assignedToAdminId ?? null,
      resolvedAt: created.resolvedAt ? created.resolvedAt.toISOString() : null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  @Get('external-refund-requests')
  @ApiOperation({ summary: 'Список операционных заявок на ручной возврат (external)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listExternalRefundRequests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
  ) {
    const pg = parsePagination({ page, limit });
    const where: Prisma.ExternalRefundRequestWhereInput = {};

    if (status) where.status = status as ExternalRefundRequestStatus;
    if (provider) where.externalOrderLink = { provider: parseTicketProviderCodeParam(provider) };

    const [items, total] = await Promise.all([
      this.prisma.externalRefundRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(pg),
        include: { externalOrderLink: { select: { provider: true, externalOrderId: true, status: true, integrationState: true } } },
      }),
      this.prisma.externalRefundRequest.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((r) => ({
        id: r.id,
        externalOrderLinkId: r.externalOrderLinkId,
        provider: r.externalOrderLink.provider,
        externalOrderId: r.externalOrderLink.externalOrderId,
        externalOrderStatus: r.externalOrderLink.status,
        integrationState: r.externalOrderLink.integrationState,
        status: r.status,
        reason: r.reason,
        reasonNote: r.reasonNote ?? null,
        amount: r.amount ?? null,
        currency: r.currency,
        createdByAdminId: r.createdByAdminId ?? null,
        assignedToAdminId: r.assignedToAdminId ?? null,
        resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      pg.limit,
    );
  }

  @Patch('external-refund-requests/:id')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Обновить операционную заявку на ручной возврат (external)' })
  async patchExternalRefundRequest(@Param('id') id: string, @Body() body: PatchExternalRefundRequestDto) {
    const existing = await this.prisma.externalRefundRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Заявка не найдена');

    const next: Prisma.ExternalRefundRequestUncheckedUpdateInput = {};

    if (body.status) {
      next.status = body.status;
      if (body.status === ExternalRefundRequestStatus.COMPLETED || body.status === ExternalRefundRequestStatus.REJECTED) {
        next.resolvedAt = new Date();
      }
      if (body.status === ExternalRefundRequestStatus.CANCELED) {
        next.resolvedAt = new Date();
      }
    }
    if (body.reason) next.reason = body.reason;
    if (body.reasonNote !== undefined) next.reasonNote = body.reasonNote?.trim() ? body.reasonNote.trim() : null;
    if (body.amount !== undefined) next.amount = body.amount ?? null;
    if (body.currency !== undefined) next.currency = body.currency?.trim() ? body.currency.trim().toUpperCase() : existing.currency;
    if (body.unassign) next.assignedToAdminId = null;
    else if (body.assignedToAdminId !== undefined) next.assignedToAdminId = body.assignedToAdminId;

    if (Object.keys(next).length === 0) {
      throw new BadRequestException('Нет изменений');
    }

    const updated = await this.prisma.externalRefundRequest.update({ where: { id }, data: next });
    return {
      id: updated.id,
      externalOrderLinkId: updated.externalOrderLinkId,
      status: updated.status,
      reason: updated.reason,
      reasonNote: updated.reasonNote ?? null,
      amount: updated.amount ?? null,
      currency: updated.currency,
      createdByAdminId: updated.createdByAdminId ?? null,
      assignedToAdminId: updated.assignedToAdminId ?? null,
      resolvedAt: updated.resolvedAt ? updated.resolvedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}

