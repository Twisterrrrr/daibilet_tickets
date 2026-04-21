import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

import { RoutePointTargetType } from '@/prisma-client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import {
  AdminEventRouteService,
  type PutEventRouteInput,
} from '../routes/admin-event-route.service';

class PutEventRoutePointDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  order!: number;

  @IsEnum(RoutePointTargetType)
  targetType!: RoutePointTargetType;

  @IsOptional()
  @IsUUID()
  venueId?: string | null;

  @IsOptional()
  @IsUUID()
  eventId?: string | null;

  @IsOptional()
  @IsString()
  titleOverride?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMinutes?: number | null;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;
}

class PutEventRouteBodyDto {
  @IsOptional()
  @IsString()
  title?: string | null;

  @IsOptional()
  @IsString()
  summary?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  version?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PutEventRoutePointDto)
  points!: PutEventRoutePointDto[];
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/events')
export class AdminEventRouteController {
  constructor(private readonly adminEventRoute: AdminEventRouteService) {}

  @Get(':eventId/route')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async get(@Param('eventId') eventId: string) {
    const route = await this.adminEventRoute.getForAdmin(eventId);
    return route;
  }

  @Put(':eventId/route')
  @Roles('ADMIN', 'EDITOR')
  async put(@Param('eventId') eventId: string, @Body() body: PutEventRouteBodyDto) {
    const payload: PutEventRouteInput = {
      title: body.title,
      summary: body.summary,
      isPublished: body.isPublished,
      version: body.version,
      points: (body.points ?? []).map((p) => ({
        id: p.id,
        order: p.order,
        targetType: p.targetType,
        venueId: p.venueId,
        eventId: p.eventId,
        titleOverride: p.titleOverride,
        description: p.description,
        durationMinutes: p.durationMinutes,
        isOptional: p.isOptional,
      })),
    };
    return this.adminEventRoute.putForEvent(eventId, payload);
  }

  @Delete(':eventId/route')
  @Roles('ADMIN', 'EDITOR')
  async remove(@Param('eventId') eventId: string) {
    return this.adminEventRoute.deleteForEvent(eventId);
  }
}
