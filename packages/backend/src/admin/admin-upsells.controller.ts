import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, paginationArgs, buildPaginatedResult } from '../common/pagination';
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
