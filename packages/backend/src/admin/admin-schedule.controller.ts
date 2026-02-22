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
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { OccurrencePolicyService } from '../schedule/occurrence-policy.service';
import { ScheduleService } from '../schedule/schedule.service';
import { PrismaService } from '../prisma/prisma.service';
import type { RescheduleReason, SessionStatus } from '@prisma/client';

import { Roles } from '../auth/roles.guard';
import {
  CreateTicketQuotaOverrideDto,
  UpdateTicketQuotaOverrideDto,
} from './dto/admin-tariff.dto';

@ApiTags('admin/schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/schedules')
export class AdminScheduleController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: ScheduleService,
    private readonly policyService: OccurrencePolicyService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Список расписаний' })
  async list(@Query('offerId') offerId?: string) {
    const where = offerId ? { offerId } : {};
    return this.prisma.eventSchedule.findMany({
      where,
      include: { offer: { select: { id: true, eventId: true, event: { select: { title: true } } } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Расписание по ID' })
  async get(@Param('id') id: string) {
    const s = await this.prisma.eventSchedule.findUnique({
      where: { id },
      include: {
        offer: { include: { event: true } },
        sessions: { orderBy: { startsAt: 'asc' }, take: 50 },
      },
    });
    if (!s) throw new NotFoundException();
    return s;
  }

  @Post()
  @ApiOperation({ summary: 'Создать/обновить расписание' })
  async upsert(@Body() body: { offerId: string; type: string; timezone?: string; durationMin?: number; salesFrom?: string; salesTo?: string; rule: Record<string, unknown> }) {
    const schedule = await this.scheduleService.upsertSchedule({
      offerId: body.offerId,
      type: body.type as 'ONE_TIME' | 'OPEN_DATE' | 'RECURRENCE',
      timezone: body.timezone,
      durationMin: body.durationMin,
      salesFrom: body.salesFrom ? new Date(body.salesFrom) : null,
      salesTo: body.salesTo ? new Date(body.salesTo) : null,
      rule: body.rule,
    });
    return schedule;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить расписание (pause/resume)' })
  async update(
    @Param('id') id: string,
    @Body() body: { isActive?: boolean },
  ) {
    const s = await this.prisma.eventSchedule.update({
      where: { id },
      data: body.isActive !== undefined ? { isActive: body.isActive } : {},
    });
    return s;
  }

  @Post(':id/generate')
  @ApiOperation({ summary: 'Генерировать occurrences на период' })
  async generate(
    @Param('id') id: string,
    @Body() body: { from?: string; to?: string },
  ) {
    const from = body.from ? new Date(body.from) : new Date();
    const to = body.to ? new Date(body.to) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const count = await this.scheduleService.generateOccurrences(id, from, to);
    return { generated: count };
  }

  @Get(':id/occurrences')
  @ApiOperation({ summary: 'Список occurrences расписания' })
  async listOccurrences(
    @Param('id') id: string,
    @Query('limit') limit = '50',
    @Query('status') status?: SessionStatus,
  ) {
    const sessions = await this.prisma.eventSession.findMany({
      where: { scheduleId: id, ...(status && { status }) },
      orderBy: { startsAt: 'asc' },
      take: Math.min(parseInt(limit, 10) || 50, 200),
    });
    return sessions;
  }

  @Post('occurrences/bulk')
  @ApiOperation({ summary: 'Массовые операции' })
  async bulk(
    @Body() body: {
      sessionIds: string[];
      action: 'pause' | 'resume' | 'cancel';
      reason?: string;
    },
  ) {
    const { sessionIds, action, reason } = body;
    let updated = 0;
    const errors: string[] = [];
    for (const id of sessionIds) {
      try {
        if (action === 'pause') {
          await this.prisma.eventSession.update({ where: { id }, data: { status: 'PAUSED' } });
        } else if (action === 'resume') {
          await this.prisma.eventSession.update({ where: { id }, data: { status: 'ACTIVE' } });
        } else if (action === 'cancel') {
          await this.policyService.cancel(id, reason ?? 'Bulk cancel');
        }
        updated++;
      } catch (e) {
        errors.push(`${id}: ${(e as Error).message}`);
      }
    }
    return { updated, errors };
  }

  @Patch('occurrences/:sessionId/status')
  @ApiOperation({ summary: 'Изменить статус сеанса' })
  async updateSessionStatus(
    @Param('sessionId') sessionId: string,
    @Body() body: { status: SessionStatus },
  ) {
    const s = await this.prisma.eventSession.update({
      where: { id: sessionId },
      data: { status: body.status },
    });
    return s;
  }

  @Patch('occurrences/:sessionId/cancel')
  @ApiOperation({ summary: 'Отменить сеанс' })
  async cancelSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { reason?: string },
  ) {
    await this.policyService.cancel(sessionId, body.reason ?? 'Отменён');
    return { ok: true };
  }

  @Post('occurrences/:sessionId/reschedule')
  @ApiOperation({ summary: 'Перенести сеанс' })
  async rescheduleSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { newStartsAt: string; reason: RescheduleReason; note?: string },
  ) {
    const newId = await this.policyService.reschedule(
      sessionId,
      new Date(body.newStartsAt),
      body.reason,
      body.note,
    );
    return { newOccurrenceId: newId };
  }

  @Delete('occurrences/:sessionId')
  @ApiOperation({ summary: 'Удалить сеанс (только если нет заказов)' })
  async deleteSession(@Param('sessionId') sessionId: string) {
    await this.policyService.deleteOrThrow(sessionId);
    return { ok: true };
  }

  @Get('occurrences/:sessionId/quota-overrides')
  @ApiOperation({ summary: 'Список quota overrides для сеанса' })
  async listQuotaOverrides(@Param('sessionId') sessionId: string) {
    await this.ensureSession(sessionId);
    return this.prisma.ticketQuotaOverride.findMany({
      where: { sessionId },
      include: { category: { select: { id: true, code: true, title: true } } },
    });
  }

  @Post('occurrences/:sessionId/quota-overrides')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Создать quota override' })
  async createQuotaOverride(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateTicketQuotaOverrideDto,
  ) {
    await this.ensureSession(sessionId);
    const existing = await this.prisma.ticketQuotaOverride.findUnique({
      where: { sessionId_categoryId: { sessionId, categoryId: dto.categoryId ?? null } },
    });
    if (existing) throw new BadRequestException('Quota override for this category already exists');
    return this.prisma.ticketQuotaOverride.create({
      data: {
        sessionId,
        categoryId: dto.categoryId ?? null,
        capacityTotal: dto.capacityTotal ?? null,
      },
      include: { category: { select: { id: true, code: true, title: true } } },
    });
  }

  @Patch('occurrences/:sessionId/quota-overrides/:overrideId')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Обновить quota override' })
  async updateQuotaOverride(
    @Param('sessionId') sessionId: string,
    @Param('overrideId') overrideId: string,
    @Body() dto: UpdateTicketQuotaOverrideDto,
  ) {
    const o = await this.prisma.ticketQuotaOverride.findFirst({
      where: { id: overrideId, sessionId },
    });
    if (!o) throw new NotFoundException('TicketQuotaOverride not found');
    return this.prisma.ticketQuotaOverride.update({
      where: { id: overrideId },
      data: { ...(dto.capacityTotal !== undefined && { capacityTotal: dto.capacityTotal }) },
      include: { category: { select: { id: true, code: true, title: true } } },
    });
  }

  @Delete('occurrences/:sessionId/quota-overrides/:overrideId')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Удалить quota override' })
  async deleteQuotaOverride(
    @Param('sessionId') sessionId: string,
    @Param('overrideId') overrideId: string,
  ) {
    const o = await this.prisma.ticketQuotaOverride.findFirst({
      where: { id: overrideId, sessionId },
    });
    if (!o) throw new NotFoundException('TicketQuotaOverride not found');
    await this.prisma.ticketQuotaOverride.delete({ where: { id: overrideId } });
    return { deleted: true };
  }

  private async ensureSession(sessionId: string) {
    const s = await this.prisma.eventSession.findUnique({ where: { id: sessionId } });
    if (!s) throw new NotFoundException('EventSession not found');
  }
}
