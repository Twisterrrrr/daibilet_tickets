import {
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { UpdateCityDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/cities')
export class AdminCitiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('hasEvents') hasEvents?: string,
    @Query('hasLandings') hasLandings?: string,
    @Query('hasCombos') hasCombos?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const where: Prisma.CityWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (hasEvents === 'true') {
      where.events = { some: {} };
    }
    if (hasLandings === 'true') {
      where.landingPages = { some: {} };
    }
    if (hasCombos === 'true') {
      where.comboPages = { some: {} };
    }

    const pg = parsePagination({ cursor, page, limit });
    const [rawItems, total] = await Promise.all([
      this.prisma.city.findMany({
        where,
        include: { _count: { select: { events: true, landingPages: true, comboPages: true } } },
        orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
        ...paginationArgs(pg),
      }),
      this.prisma.city.count({ where }),
    ]);
    return buildPaginatedResult(rawItems, total, pg.limit);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.city.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { events: true, landingPages: true, comboPages: true, packages: true } } },
    });
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdateCityDto) {
    const clean: Prisma.CityUpdateInput = {};
    if (data.name !== undefined) clean.name = data.name;
    if (data.description !== undefined) clean.description = data.description;
    if (data.heroImage !== undefined) clean.heroImage = data.heroImage;
    if (data.lat !== undefined) clean.lat = data.lat;
    if (data.lng !== undefined) clean.lng = data.lng;
    if (data.timezone !== undefined) clean.timezone = data.timezone;
    if (data.metaTitle !== undefined) clean.metaTitle = data.metaTitle;
    if (data.metaDescription !== undefined) clean.metaDescription = data.metaDescription;
    if (data.isFeatured !== undefined) clean.isFeatured = data.isFeatured;
    if (data.isActive !== undefined) clean.isActive = data.isActive;

    // Optimistic lock
    if (data.version !== undefined) {
      const result = await this.prisma.city.updateMany({
        where: { id, version: data.version },
        data: { ...clean, version: { increment: 1 } },
      });
      if (result.count === 0) {
        throw new ConflictException('Данные были изменены другим пользователем. Перезагрузите и попробуйте снова.');
      }
      return this.prisma.city.findUniqueOrThrow({ where: { id } });
    }

    return this.prisma.city.update({ where: { id }, data: clean });
  }
}
