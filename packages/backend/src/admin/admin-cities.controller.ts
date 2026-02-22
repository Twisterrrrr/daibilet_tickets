import {
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { UpdateCityDto } from './dto/admin-city.dto';

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
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
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
    const {
      id: _,
      createdAt,
      updatedAt,
      _count,
      events,
      packages,
      articles,
      landingPages,
      comboPages,
      version,
      ...clean
    } = data as any;

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
