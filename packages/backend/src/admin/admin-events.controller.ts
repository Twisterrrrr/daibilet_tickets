import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { EventOverrideService } from './event-override.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/events')
export class AdminEventsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly overrideService: EventOverrideService,
  ) {}

  @Get()
  async list(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('source') source?: string,
    @Query('active') active?: string,
    @Query('hidden') hidden?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const where: any = {};
    if (city) where.city = { slug: city };
    if (category) where.category = category;
    if (source) where.source = source;
    if (active !== undefined) where.isActive = active === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          city: { select: { slug: true, name: true } },
          _count: { select: { sessions: true, tags: true } },
          override: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    // Опционально: фильтрация по isHidden через override
    let filtered = items;
    if (hidden === 'true') {
      filtered = items.filter((e: any) => e.override?.isHidden === true);
    } else if (hidden === 'false') {
      filtered = items.filter((e: any) => !e.override?.isHidden);
    }

    return { items: filtered, total, page, pages: Math.ceil(total / limit) };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.event.findUniqueOrThrow({
      where: { id },
      include: {
        city: { select: { slug: true, name: true } },
        sessions: { where: { isActive: true }, orderBy: { startsAt: 'asc' }, take: 20 },
        tags: { include: { tag: true } },
        override: true,
      },
    });
  }

  /**
   * Создать/обновить override для события (вместо прямого PUT).
   */
  @Patch(':id/override')
  @Roles('ADMIN', 'EDITOR')
  async upsertOverride(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.overrideService.upsert(id, data, req.user.id);
  }

  /**
   * Удалить override — вернуть к данным из sync.
   */
  @Delete(':id/override')
  @Roles('ADMIN', 'EDITOR')
  async deleteOverride(@Param('id') id: string) {
    const result = await this.overrideService.remove(id);
    return result || { message: 'Override не найден' };
  }

  /**
   * Toggle скрытия события.
   */
  @Patch(':id/hide')
  @Roles('ADMIN', 'EDITOR')
  async toggleHide(@Param('id') id: string, @Body('isHidden') isHidden: boolean, @Request() req: any) {
    return this.overrideService.toggleHidden(id, isHidden, req.user.id);
  }
}
