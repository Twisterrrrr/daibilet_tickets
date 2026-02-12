import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, ConflictException, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(
    @Query('city') city?: string,
    @Query('published') published?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const where: any = { isDeleted: false };
    if (city) where.city = { slug: city };
    if (published !== undefined) where.isPublished = published === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: {
          city: { select: { slug: true, name: true } },
          _count: { select: { articleEvents: true, articleTags: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.article.count({ where }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.article.findUniqueOrThrow({
      where: { id },
      include: {
        city: { select: { slug: true, name: true } },
        articleEvents: { include: { event: { select: { id: true, title: true, slug: true } } } },
        articleTags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    });
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() data: any) {
    const { articleEvents, articleTags, ...articleData } = data;
    return this.prisma.article.create({ data: articleData });
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    const { id: _, createdAt, updatedAt, city, articleEvents, articleTags, _count, version, ...clean } = data;

    if (data.version !== undefined) {
      const before = await this.prisma.article.findUnique({ where: { id } });

      const [result] = await this.prisma.$transaction([
        this.prisma.article.updateMany({
          where: { id, version: data.version },
          data: { ...clean, version: { increment: 1 } },
        }),
      ]);

      if (result.count === 0) {
        throw new ConflictException('Данные были изменены другим пользователем');
      }

      const after = await this.prisma.article.findUnique({ where: { id } });
      await this.audit.log(req.user.id, 'UPDATE', 'Article', id, before, after);
      return after;
    }

    return this.prisma.article.update({ where: { id }, data: clean });
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.prisma.article.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { success: true };
  }
}
