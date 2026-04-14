import { BadRequestException, Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LocationType } from '@/prisma-client';
import { isUUID } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/locations')
export class AdminLocationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Список локаций города (причалы, точки старта и т.д.) для привязки к событию' })
  async list(@Query('cityId') cityId: string, @Query('type') type?: string) {
    if (!cityId || !isUUID(cityId)) {
      throw new BadRequestException('Query cityId (UUID) обязателен');
    }
    let typeFilter: LocationType | undefined;
    if (type) {
      if (!Object.values(LocationType).includes(type as LocationType)) {
        throw new BadRequestException('Некорректный параметр type');
      }
      typeFilter = type as LocationType;
    }
    const city = await this.prisma.city.findUnique({ where: { id: cityId }, select: { id: true } });
    if (!city) {
      throw new BadRequestException('Город не найден');
    }

    const where: { cityId: string; isActive: boolean; type?: LocationType } = {
      cityId,
      isActive: true,
    };
    if (typeFilter) {
      where.type = typeFilter;
    }

    const rows = await this.prisma.location.findMany({
      where,
      select: {
        id: true,
        title: true,
        shortTitle: true,
        type: true,
        address: true,
      },
      orderBy: [{ type: 'asc' }, { title: 'asc' }],
    });

    return { items: rows };
  }
}
