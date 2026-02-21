import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, BadRequestException, ConflictException, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { CreateTagDto, UpdateTagDto } from './dto/admin-tag.dto';
import { parsePagination, paginationArgs, buildPaginatedResult } from '../common/pagination';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/tags')
export class AdminTagsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const where: any = { isDeleted: false };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pg = parsePagination({ cursor, page, limit });
    const [rawItems, total] = await Promise.all([
      this.prisma.tag.findMany({
        where,
        include: { _count: { select: { events: true } } },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        ...paginationArgs(pg),
      }),
      this.prisma.tag.count({ where }),
    ]);
    return buildPaginatedResult(rawItems, total, pg.limit);
  }

  @Post('unlink-from-events')
  @Roles('ADMIN')
  async unlinkFromEvents(@Body('slug') slug: string) {
    if (!slug) {
      throw new BadRequestException('slug обязателен');
    }
    const tag = await this.prisma.tag.findFirst({ where: { slug } });
    if (!tag) {
      return { success: true, deleted: 0, message: 'Тег не найден' };
    }
    const result = await this.prisma.eventTag.deleteMany({ where: { tagId: tag.id } });
    return { success: true, deleted: result.count };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.tag.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { events: true, articleTags: true } } },
    });
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() data: CreateTagDto) {
    return this.prisma.tag.create({ data });
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdateTagDto) {
    const { id: _, createdAt, updatedAt, events, articleTags, _count, version, ...clean } = data as any;

    if (data.version !== undefined) {
      const result = await this.prisma.tag.updateMany({
        where: { id, version: data.version },
        data: { ...clean, version: { increment: 1 } },
      });
      if (result.count === 0) {
        throw new ConflictException('Данные были изменены другим пользователем');
      }
      return this.prisma.tag.findUniqueOrThrow({ where: { id } });
    }

    return this.prisma.tag.update({ where: { id }, data: clean });
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    // Soft delete
    await this.prisma.tag.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { success: true };
  }
}
