import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CollectionSelectionBasis, CollectionSourceType, CollectionStatus, Prisma } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CollectionSuggestionService } from '../collection/collection-suggestion.service';
import { CollectionSelectionService } from '../catalog/collection-selection.service';
import { AuditInterceptor } from './audit.interceptor';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/collections')
export class AdminCollectionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suggestionService: CollectionSuggestionService,
    private readonly selectionService: CollectionSelectionService,
  ) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async list(
    @Query('cursor') cursor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('status') status?: CollectionStatus,
    @Query('sourceType') sourceType?: CollectionSourceType,
    @Query('selectionBasis') selectionBasis?: CollectionSelectionBasis,
  ) {
    const pg = parsePagination({ cursor, page, limit: limit || '20' });

    const where: Prisma.CollectionWhereInput = {
      isDeleted: false,
      ...(city && { city: { slug: city } }),
      ...(search && {
        OR: [{ title: { contains: search, mode: 'insensitive' } }, { slug: { contains: search, mode: 'insensitive' } }],
      }),
      ...(status && { status }),
      ...(sourceType && { sourceType }),
      ...(selectionBasis && { selectionBasis }),
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
        sourceType: c.sourceType,
        status: c.status,
        selectionBasis: c.selectionBasis,
        eventCountCached: c.eventCountCached,
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
        additionalFilters: (body.additionalFilters as Prisma.InputJsonValue) ?? undefined,
        rankingJson: (body.rankingJson as Prisma.InputJsonValue) ?? undefined,
        pinnedEventIds: body.pinnedEventIds || [],
        excludedEventIds: body.excludedEventIds || [],
        metaTitle: body.metaTitle || null,
        metaDescription: body.metaDescription || null,
        infoBlocks: (body.infoBlocks as Prisma.InputJsonValue) ?? undefined,
        faq: (body.faq as Prisma.InputJsonValue) ?? undefined,
        sourceType: body.sourceType ?? CollectionSourceType.MANUAL,
        selectionBasis: body.selectionBasis ?? CollectionSelectionBasis.MANUAL,
        status: body.status ?? (body.isActive ? CollectionStatus.ACTIVE : CollectionStatus.DRAFT),
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
        ...(body.additionalFilters !== undefined && {
          additionalFilters: body.additionalFilters as Prisma.InputJsonValue,
        }),
        ...(body.rankingJson !== undefined && {
          rankingJson: body.rankingJson as Prisma.InputJsonValue,
        }),
        ...(body.pinnedEventIds !== undefined && { pinnedEventIds: body.pinnedEventIds }),
        ...(body.excludedEventIds !== undefined && { excludedEventIds: body.excludedEventIds }),
        ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle || null }),
        ...(body.metaDescription !== undefined && { metaDescription: body.metaDescription || null }),
        ...(body.infoBlocks !== undefined && { infoBlocks: body.infoBlocks as Prisma.InputJsonValue }),
        ...(body.faq !== undefined && { faq: body.faq as Prisma.InputJsonValue }),
        ...(body.sourceType !== undefined && { sourceType: body.sourceType }),
        ...(body.selectionBasis !== undefined && { selectionBasis: body.selectionBasis }),
        ...(body.status !== undefined && { status: body.status }),
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

  @Post('suggestions/generate')
  @Roles('ADMIN', 'EDITOR')
  async generateSuggestions() {
    return this.suggestionService.generateCollectionSuggestions();
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'EDITOR')
  async approve(@Param('id') id: string) {
    return this.prisma.collection.update({
      where: { id },
      data: {
        status: CollectionStatus.ACTIVE,
        sourceType: CollectionSourceType.ACTIVE,
        isActive: true,
      },
    });
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'EDITOR')
  async reject(@Param('id') id: string) {
    return this.prisma.collection.update({
      where: { id },
      data: {
        status: CollectionStatus.REJECTED,
        isActive: false,
      },
    });
  }

  @Post('preview')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async previewSelection(
    @Body()
    body: {
      cityId?: string;
      filterTags?: string[];
      filterCategory?: string | null;
      filterSubcategory?: string | null;
      filterAudience?: string | null;
      additionalFilters?: Record<string, unknown>;
      rankingJson?: { preset?: 'popularity' | 'availability' | 'balanced' };
      pinnedEventIds?: string[];
      excludedEventIds?: string[];
      limit?: number;
    },
  ) {
    const resolved = await this.selectionService.resolveSelection({
      cityId: body.cityId ?? null,
      filterTags: body.filterTags ?? [],
      filterCategory: body.filterCategory ?? null,
      filterSubcategory: body.filterSubcategory ?? null,
      filterAudience: body.filterAudience ?? null,
      additionalFilters: body.additionalFilters ?? undefined,
      ranking: body.rankingJson ?? { preset: 'balanced' },
      pinnedEventIds: body.pinnedEventIds ?? [],
      excludedEventIds: body.excludedEventIds ?? [],
      page: 1,
      limit: Math.min(30, Math.max(1, body.limit ?? 10)),
    });

    return {
      eventCount: resolved.preview.eventCount,
      generatedAt: resolved.preview.generatedAt,
      items: resolved.items.map((event) => ({
        id: event.id,
        title: event.title,
        slug: event.slug,
        city: event.city ? { slug: event.city.slug, name: event.city.name } : null,
        rating: event.rating,
        reviewCount: event.reviewCount,
      })),
    };
  }
}
