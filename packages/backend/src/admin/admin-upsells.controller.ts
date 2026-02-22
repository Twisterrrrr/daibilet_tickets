import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { CreateUpsellDto, UpdateUpsellDto } from './dto/admin-upsell.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/upsells')
export class AdminUpsellsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('city') citySlug?: string,
    @Query('active') active?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const where: any = {};
    if (citySlug) where.citySlug = citySlug;
    if (active !== undefined) where.isActive = active === 'true';

    const pg = parsePagination({ cursor, page, limit });
    const [rawItems, total] = await Promise.all([
      this.prisma.upsellItem.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        ...paginationArgs(pg),
      }),
      this.prisma.upsellItem.count({ where }),
    ]);
    return buildPaginatedResult(rawItems, total, pg.limit);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.upsellItem.findUniqueOrThrow({ where: { id } });
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() data: CreateUpsellDto) {
    return this.prisma.upsellItem.create({ data });
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() data: UpdateUpsellDto) {
    const { id: _, createdAt, updatedAt, ...clean } = data as any;
    return this.prisma.upsellItem.update({ where: { id }, data: clean });
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.prisma.upsellItem.delete({ where: { id } });
    return { success: true };
  }
}
