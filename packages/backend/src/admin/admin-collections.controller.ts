import {
  Controller, Get, Post, Patch, Delete,
  Param, Query, Body, UseGuards, UseInterceptors,
  NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/admin-collection.dto';
import { parsePagination, paginationArgs } from '../common/pagination';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/collections')
export class AdminCollectionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async list(
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
  ) {
    const pg = parsePagination({ cursor, page, limit: limit || '20' });

    const where: any = {
      isDeleted: false,
      ...(city && { city: { slug: city } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.collection.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        ...paginationArgs(pg),
        include: {
          city: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.collection.count({ where }),
    ]);

    // Убираем лишний элемент (limit+1) для определения hasMore
    const hasMore = items.length > pg.limit;
    const pageItems = hasMore ? items.slice(0, pg.limit) : items;
    const nextCursor = hasMore && pageItems.length > 0 ? pageItems[pageItems.length - 1].id : null;

    return {
      items: pageItems.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        subtitle: c.subtitle,
        city: c.city,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
        filterCategory: c.filterCategory,
        filterTags: c.filterTags,
        pinnedCount: c.pinnedEventIds.length,
        excludedCount: c.excludedEventIds.length,
        updatedAt: c.updatedAt,
      })),
      total,
      nextCursor,
      hasMore,
    };
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async get(@Param('id') id: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: {
        city: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!collection) throw new NotFoundException('Подборка не найдена');
    return collection;
  }

  @Post()
  @Roles('ADMIN', 'EDITOR')
  async create(@Body() body: CreateCollectionDto) {
    if (!body.slug || !body.title) {
      throw new BadRequestException('slug и title обязательны');
    }

    const existing = await this.prisma.collection.findUnique({ where: { slug: body.slug } });
    if (existing) throw new ConflictException(`Slug "${body.slug}" уже существует`);

    const collection = await this.prisma.collection.create({
      data: {
        slug: body.slug,
        title: body.title,
        subtitle: body.subtitle || null,
        cityId: body.cityId || null,
        heroImage: body.heroImage || null,
        description: body.description || null,
        filterTags: body.filterTags || [],
        filterCategory: body.filterCategory || null,
        filterSubcategory: body.filterSubcategory || null,
        filterAudience: body.filterAudience || null,
        additionalFilters: (body.additionalFilters as any) || undefined,
        pinnedEventIds: body.pinnedEventIds || [],
        excludedEventIds: body.excludedEventIds || [],
        metaTitle: body.metaTitle || null,
        metaDescription: body.metaDescription || null,
        infoBlocks: (body.infoBlocks as any) || undefined,
        faq: (body.faq as any) || undefined,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return collection;
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  async update(@Param('id') id: string, @Body() body: UpdateCollectionDto) {
    const version = body.version;
    if (version === undefined) throw new BadRequestException('version обязателен для обновления');

    const result = await this.prisma.collection.updateMany({
      where: { id, version: Number(version) },
      data: {
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.subtitle !== undefined && { subtitle: body.subtitle || null }),
        ...(body.cityId !== undefined && { cityId: body.cityId || null }),
        ...(body.heroImage !== undefined && { heroImage: body.heroImage || null }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.filterTags !== undefined && { filterTags: body.filterTags }),
        ...(body.filterCategory !== undefined && { filterCategory: body.filterCategory || null }),
        ...(body.filterSubcategory !== undefined && { filterSubcategory: body.filterSubcategory || null }),
        ...(body.filterAudience !== undefined && { filterAudience: body.filterAudience || null }),
        ...(body.additionalFilters !== undefined && { additionalFilters: body.additionalFilters as any }),
        ...(body.pinnedEventIds !== undefined && { pinnedEventIds: body.pinnedEventIds }),
        ...(body.excludedEventIds !== undefined && { excludedEventIds: body.excludedEventIds }),
        ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle || null }),
        ...(body.metaDescription !== undefined && { metaDescription: body.metaDescription || null }),
        ...(body.infoBlocks !== undefined && { infoBlocks: body.infoBlocks as any }),
        ...(body.faq !== undefined && { faq: body.faq as any }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Данные были изменены другим пользователем. Обновите страницу.');
    }

    return this.prisma.collection.findUnique({ where: { id } });
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Подборка не найдена');

    await this.prisma.collection.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), isActive: false },
    });

    return { success: true };
  }
}
