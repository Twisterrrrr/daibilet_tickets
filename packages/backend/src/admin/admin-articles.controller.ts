import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { AdminAuthUser } from '../auth/auth.types';
import type { Request as ExpressRequest } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { CreateArticleDto, UpdateArticleDto } from './dto/admin-article.dto';

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
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit });
    const where: any = { isDeleted: false };
    if (city) where.city = { slug: city };
    if (published !== undefined) where.isPublished = published === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rawItems, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: {
          city: { select: { slug: true, name: true } },
          _count: { select: { articleEvents: true, articleTags: true } },
        },
        orderBy: { updatedAt: 'desc' },
        ...paginationArgs(pg),
      }),
      this.prisma.article.count({ where }),
    ]);

    return buildPaginatedResult(rawItems, total, pg.limit);
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
  async create(@Body() data: CreateArticleDto) {
    const { articleEvents, articleTags, ...articleData } = data as any;
    return this.prisma.article.create({ data: articleData });
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdateArticleDto, @Request() req: ExpressRequest & { user: AdminAuthUser }) {
    const { id: _, createdAt, updatedAt, city, articleEvents, articleTags, _count, version, ...clean } = data as any;

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
