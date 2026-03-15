import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SupplierTrustService } from '../supplier/supplier-trust.service';
import { AuditInterceptor } from './audit.interceptor';
import { RejectModerationDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/moderation')
export class AdminModerationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierTrust: SupplierTrustService,
  ) {}

  /**
   * Очередь модерации: события со статусом PENDING_REVIEW или AUTO_APPROVED (пост-модерация).
   * sortBy=trust_asc — приоритет модерации по trust level (низкий первым).
   */
  @Get('queue')
  async queue(
    @Query('status') status?: string,
    @Query('page') pageRaw = '1',
    @Query('limit') limitRaw = '25',
    @Query('sortBy') sortBy?: string,
  ) {
    const page = Number(pageRaw) || 1;
    const limit = Number(limitRaw) || 25;

    const where: Record<string, unknown> = {};
    if (status) {
      where.moderationStatus = status;
    } else {
      where.moderationStatus = { in: ['PENDING_REVIEW', 'AUTO_APPROVED'] };
    }

    const orderByTrustAsc = sortBy === 'trust_asc';
    const orderBy = orderByTrustAsc
      ? [{ operator: { trustLevel: 'asc' as const } }, { createdAt: 'desc' as const }]
      : [{ createdAt: 'desc' as const }];

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          city: { select: { id: true, name: true } },
          operator: { select: { id: true, name: true, trustLevel: true, companyName: true } },
          _count: { select: { offers: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit), sortBy: sortBy ?? 'created_desc' };
  }

  /**
   * Счётчик для badge в sidebar.
   */
  @Get('count')
  async pendingCount() {
    const count = await this.prisma.event.count({
      where: { moderationStatus: 'PENDING_REVIEW' },
    });
    return { pending: count };
  }

  /**
   * Одобрить событие.
   */
  @Post(':id/approve')
  @Roles('ADMIN', 'EDITOR')
  async approve(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Событие не найдено');

    if (!['PENDING_REVIEW', 'AUTO_APPROVED', 'REJECTED'].includes(event.moderationStatus)) {
      throw new BadRequestException(`Нельзя одобрить событие в статусе ${event.moderationStatus}`);
    }

    if (event.operatorId) {
      // Проверка лимита активных событий для поставщика перед публикацией.
      await this.supplierTrust.assertSupplierCanActivateEvent(event.operatorId);
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        moderationStatus: 'APPROVED',
        moderatedAt: new Date(),
        moderatedBy: req.user.id,
        isActive: true,
        moderationNote: null,
      },
    });

    // Обновить successfulSales у оператора (если это первое одобрение)
    if (event.operatorId) {
      await this.prisma.operator.update({
        where: { id: event.operatorId },
        data: { successfulSales: { increment: 0 } }, // пока просто touch
      });
    }

    return updated;
  }

  /**
   * Отклонить событие с причиной.
   */
  @Post(':id/reject')
  @Roles('ADMIN', 'EDITOR')
  async reject(@Param('id') id: string, @Req() req: { user: { id: string } }, @Body() body: RejectModerationDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Событие не найдено');

    if (!body.reason) throw new BadRequestException('Укажите причину отклонения');

    return this.prisma.event.update({
      where: { id },
      data: {
        moderationStatus: 'REJECTED',
        moderatedAt: new Date(),
        moderatedBy: req.user.id,
        moderationNote: body.reason,
        isActive: false,
      },
    });
  }
}
