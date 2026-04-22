import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Prisma } from '@/prisma-client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EDITOR')
@Controller('admin/availability')
export class AdminAvailabilityController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('diagnostics')
  @ApiOperation({ summary: 'Диагностика доступности (events without sessions, expired/zero-capacity sessions)' })
  async diagnostics(
    @Query('cityId') cityId?: string,
    @Query('operatorId') operatorId?: string,
  ) {
    const now = new Date();

    const baseEventWhere: Prisma.EventWhereInput = {
      isActive: true,
      isDeleted: false,
    };
    if (cityId) baseEventWhere.cityId = cityId;
    if (operatorId) baseEventWhere.operatorId = operatorId;

    const [eventsWithoutSessions, expiredSessions, zeroCapacitySessions] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          ...baseEventWhere,
          dateMode: 'SCHEDULED',
          sessions: {
            none: {
              startsAt: { gte: now },
              canceledAt: null,
            },
          },
        },
        select: {
          id: true,
          title: true,
          city: { select: { id: true, name: true } },
          operatorId: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.eventSession.findMany({
        where: {
          startsAt: { lt: now },
          canceledAt: null,
          event: baseEventWhere,
        },
        select: {
          id: true,
          startsAt: true,
          eventId: true,
          event: { select: { title: true, city: { select: { id: true, name: true } } } },
        },
        orderBy: { startsAt: 'desc' },
        take: 500,
      }),
      this.prisma.eventSession.findMany({
        where: {
          startsAt: { gte: now },
          canceledAt: null,
          event: baseEventWhere,
          OR: [{ capacityTotal: 0 }, { capacityTotal: null, availableTickets: 0 }],
        },
        select: {
          id: true,
          startsAt: true,
          capacityTotal: true,
          availableTickets: true,
          eventId: true,
          event: { select: { title: true, city: { select: { id: true, name: true } } } },
        },
        orderBy: { startsAt: 'asc' },
        take: 500,
      }),
    ]);

    return {
      eventsWithoutSessions,
      expiredSessions,
      zeroCapacitySessions,
    };
  }
}

