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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArticleStatus, Prisma } from '@/prisma-client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { buildPaginatedResult, paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import type { ExpressRequest } from '../common/http/express.types';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';
import { CreateArticleDto, UpdateArticleDto } from './dto/admin.dto';

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
    const where: Prisma.ArticleWhereInput = { status: { not: ArticleStatus.ARCHIVED } };
    if (city) where.city = { slug: city };
    if (published !== undefined) {
      where.status = published === 'true' ? ArticleStatus.PUBLISHED : ArticleStatus.DRAFT;
    }
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
        landingLinks: { include: { landing: { select: { id: true, slug: true, title: true, cityId: true } } }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
        collectionLinks: { include: { collection: { select: { id: true, slug: true, title: true, cityId: true } } }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
      },
    });
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() data: CreateArticleDto) {
    const {
      articleEvents: _articleEvents,
      articleTags: _articleTags,
      landingLinks,
      collectionLinks,
      relatedLandingIds,
      relatedCollectionIds,
      ...articleData
    } = data as CreateArticleDto & {
      articleEvents?: unknown;
      articleTags?: unknown;
      landingLinks?: Array<{ landingId: string; position?: number; priority?: number }>;
      collectionLinks?: Array<{ collectionId: string; position?: number; priority?: number }>;
      relatedLandingIds?: string[];
      relatedCollectionIds?: string[];
    };

    const created = await this.prisma.article.create({
      data: {
        ...(articleData as Parameters<typeof this.prisma.article.create>[0]['data']),
        ...(relatedLandingIds ? { relatedLandingIds } : {}),
        ...(relatedCollectionIds ? { relatedCollectionIds } : {}),
      },
    });

    // New M2M links (best-effort, additive; legacy arrays remain source-of-truth if UI not migrated)
    if (landingLinks?.length) {
      await this.prisma.articleLandingLink.createMany({
        data: landingLinks.map((l) => ({
          articleId: created.id,
          landingId: l.landingId,
          position: l.position ?? 0,
          priority: l.priority ?? 0,
        })),
        skipDuplicates: true,
      });
    }
    if (collectionLinks?.length) {
      await this.prisma.articleCollectionLink.createMany({
        data: collectionLinks.map((l) => ({
          articleId: created.id,
          collectionId: l.collectionId,
          position: l.position ?? 0,
          priority: l.priority ?? 0,
        })),
        skipDuplicates: true,
      });
    }

    return this.get(created.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() data: UpdateArticleDto, @Request() req: ExpressRequest) {
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      city: _city,
      articleEvents: _articleEvents,
      articleTags: _articleTags,
      _count,
      version: _version,
      landingLinks,
      collectionLinks,
      ...clean
    } = data as UpdateArticleDto & {
      id?: string;
      createdAt?: unknown;
      updatedAt?: unknown;
      city?: unknown;
      articleEvents?: unknown;
      articleTags?: unknown;
      _count?: unknown;
      landingLinks?: Array<{ landingId: string; position?: number; priority?: number }>;
      collectionLinks?: Array<{ collectionId: string; position?: number; priority?: number }>;
    };

    // If new link payload provided, rewrite link tables transactionally (additive evolution; legacy arrays not removed)
    const wantsRewriteLinks = landingLinks !== undefined || collectionLinks !== undefined;
    if (wantsRewriteLinks) {
      await this.prisma.$transaction(async (tx) => {
        if (landingLinks !== undefined) {
          await tx.articleLandingLink.deleteMany({ where: { articleId: id } });
          if (landingLinks.length) {
            await tx.articleLandingLink.createMany({
              data: landingLinks.map((l) => ({
                articleId: id,
                landingId: l.landingId,
                position: l.position ?? 0,
                priority: l.priority ?? 0,
              })),
            });
          }
        }
        if (collectionLinks !== undefined) {
          await tx.articleCollectionLink.deleteMany({ where: { articleId: id } });
          if (collectionLinks.length) {
            await tx.articleCollectionLink.createMany({
              data: collectionLinks.map((l) => ({
                articleId: id,
                collectionId: l.collectionId,
                position: l.position ?? 0,
                priority: l.priority ?? 0,
              })),
            });
          }
        }
      });
    }

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
      await this.audit.log(req.user!.id, 'UPDATE', 'Article', id, before ?? undefined, after ?? undefined);
      return this.get(id);
    }

    await this.prisma.article.update({ where: { id }, data: clean as Prisma.ArticleUpdateInput });
    return this.get(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.prisma.article.update({
      where: { id },
      data: { status: ArticleStatus.ARCHIVED },
    });
    return { success: true };
  }
}
