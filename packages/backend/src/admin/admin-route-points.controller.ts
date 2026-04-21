import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UseGuards } from '@nestjs/common';

import { RoutePointTargetType } from '@/prisma-client';

import { assertRoutePointXor } from './route-point.validation';

class CreateRoutePointDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsEnum(RoutePointTargetType)
  targetType?: RoutePointTargetType;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  titleOverride?: string;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;
}

class UpdateRoutePointDto {
  @IsOptional()
  @IsEnum(RoutePointTargetType)
  targetType?: RoutePointTargetType;

  @IsOptional()
  @IsUUID()
  venueId?: string | null;

  @IsOptional()
  @IsUUID()
  eventId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMinutes?: number | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  titleOverride?: string | null;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;
}

class ReorderRoutePointItemDto {
  @IsUUID()
  id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  order!: number;
}

class ReorderRoutePointsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderRoutePointItemDto)
  items!: ReorderRoutePointItemDto[];
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminRoutePointsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('routes/:routeId/points')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async list(@Param('routeId') routeId: string) {
    const route = await this.prisma.route.findUnique({ where: { id: routeId }, select: { id: true } });
    if (!route) throw new NotFoundException('Route not found');

    const items = await this.prisma.routePoint.findMany({
      where: { routeId },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      include: {
        venue: { select: { id: true, title: true, slug: true, cityId: true } },
        event: { select: { id: true, title: true, slug: true } },
      },
    });
    return { items };
  }

  @Post('routes/:routeId/points')
  @Roles('ADMIN', 'EDITOR')
  async create(@Param('routeId') routeId: string, @Body() body: CreateRoutePointDto) {
    assertRoutePointXor({ venueId: body.venueId, eventId: body.eventId });
    const targetType =
      body.targetType ??
      (body.venueId ? RoutePointTargetType.VENUE : body.eventId ? RoutePointTargetType.EVENT : undefined);
    if (!targetType) throw new BadRequestException('targetType or venueId/eventId required');

    const created = await this.prisma.$transaction(async (tx) => {
      const route = await tx.route.findUnique({ where: { id: routeId }, select: { id: true } });
      if (!route) throw new NotFoundException('Route not found');

      const nextOrder =
        body.order !== undefined
          ? Number(body.order)
          : ((await tx.routePoint.aggregate({ where: { routeId }, _max: { order: true } }))._max.order ?? -1) + 1;

      return tx.routePoint.create({
        data: {
          routeId,
          order: nextOrder,
          targetType,
          venueId: body.venueId ?? null,
          eventId: body.eventId ?? null,
          durationMinutes: body.durationMinutes !== undefined ? Number(body.durationMinutes) : null,
          description: body.description?.trim() ? body.description.trim() : null,
          titleOverride: body.titleOverride?.trim() ? body.titleOverride.trim() : null,
          isOptional: body.isOptional ?? false,
        },
      });
    });

    return created;
  }

  @Patch('route-points/:id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() body: UpdateRoutePointDto) {
    const existing = await this.prisma.routePoint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('RoutePoint not found');

    const mergedVenue = body.venueId !== undefined ? body.venueId : existing.venueId;
    const mergedEvent = body.eventId !== undefined ? body.eventId : existing.eventId;
    if (body.venueId !== undefined || body.eventId !== undefined) {
      assertRoutePointXor({ venueId: mergedVenue ?? null, eventId: mergedEvent ?? null });
    }

    const nextTargetType =
      body.targetType ??
      (body.venueId !== undefined || body.eventId !== undefined
        ? mergedVenue
          ? RoutePointTargetType.VENUE
          : mergedEvent
            ? RoutePointTargetType.EVENT
            : undefined
        : undefined);

    return this.prisma.routePoint.update({
      where: { id },
      data: {
        ...(nextTargetType !== undefined && { targetType: nextTargetType }),
        ...(body.venueId !== undefined && { venueId: body.venueId }),
        ...(body.eventId !== undefined && { eventId: body.eventId }),
        ...(body.durationMinutes !== undefined && {
          durationMinutes: body.durationMinutes === null ? null : Number(body.durationMinutes),
        }),
        ...(body.description !== undefined && { description: body.description?.trim() ? body.description.trim() : null }),
        ...(body.titleOverride !== undefined && {
          titleOverride: body.titleOverride?.trim() ? body.titleOverride.trim() : null,
        }),
        ...(body.isOptional !== undefined && { isOptional: body.isOptional }),
      },
    });
  }

  @Delete('route-points/:id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    const existing = await this.prisma.routePoint.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('RoutePoint not found');
    await this.prisma.routePoint.delete({ where: { id } });
    return { success: true };
  }

  @Post('routes/:routeId/points/reorder')
  @Roles('ADMIN', 'EDITOR')
  async reorder(@Param('routeId') routeId: string, @Body() body: ReorderRoutePointsDto) {
    const items = (body.items ?? []).slice(0, 500);
    if (items.length === 0) throw new BadRequestException('items required');
    const orders = items.map((i) => i.order);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) throw new BadRequestException('order values must be unique per route');

    await this.prisma.$transaction(async (tx) => {
      const route = await tx.route.findUnique({ where: { id: routeId }, select: { id: true } });
      if (!route) throw new NotFoundException('Route not found');

      const ids = items.map((i) => i.id);
      const existing = await tx.routePoint.findMany({
        where: { id: { in: ids } },
        select: { id: true, routeId: true },
      });
      if (existing.length !== ids.length) throw new BadRequestException('Некоторые точки не найдены');
      const wrongRoute = existing.find((p) => p.routeId !== routeId);
      if (wrongRoute) throw new BadRequestException('Некоторые точки принадлежат другому маршруту');

      await Promise.all(
        items.map((i) =>
          tx.routePoint.update({
            where: { id: i.id },
            data: { order: i.order },
          }),
        ),
      );
    });

    return { success: true };
  }
}

