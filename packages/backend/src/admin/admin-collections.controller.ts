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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CollectionSelectionBasis, CollectionSourceType, CollectionStatus, Prisma } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { paginationArgs, parsePagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CollectionMaterializerService } from '../collection/collection-materializer.service';
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
    private readonly materializer: CollectionMaterializerService,
  ) {}

  private canTransition(from: CollectionStatus, to: CollectionStatus): boolean {
    const transitions: Record<CollectionStatus, CollectionStatus[]> = {
      DRAFT: [CollectionStatus.SUGGESTED, CollectionStatus.ACTIVE, CollectionStatus.ARCHIVED],
      SUGGESTED: [CollectionStatus.ACTIVE, CollectionStatus.REJECTED, CollectionStatus.ARCHIVED],
      ACTIVE: [CollectionStatus.ARCHIVED, CollectionStatus.REJECTED],
      REJECTED: [CollectionStatus.SUGGESTED, CollectionStatus.ARCHIVED],
      ARCHIVED: [],
    };
    return transitions[from]?.includes(to) ?? false;
  }

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

  @Post('materialize')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Materialize: обновить isActive коллекций по порогу событий' })
  async materialize() {
    return this.materializer.materialize();
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'EDITOR')
  async approve(@Param('id') id: string) {
    const current = await this.prisma.collection.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new NotFoundException('Подборка не найдена');
    if (!this.canTransition(current.status, CollectionStatus.ACTIVE)) {
      throw new BadRequestException(`Недопустимый переход ${current.status} -> ACTIVE`);
    }
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
    const current = await this.prisma.collection.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new NotFoundException('Подборка не найдена');
    if (!this.canTransition(current.status, CollectionStatus.REJECTED)) {
      throw new BadRequestException(`Недопустимый переход ${current.status} -> REJECTED`);
    }
    return this.prisma.collection.update({
      where: { id },
      data: {
        status: CollectionStatus.REJECTED,
        isActive: false,
      },
    });
  }

  @Post(':id/archive')
  @Roles('ADMIN', 'EDITOR')
  async archive(@Param('id') id: string) {
    const current = await this.prisma.collection.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new NotFoundException('Подборка не найдена');
    if (!this.canTransition(current.status, CollectionStatus.ARCHIVED)) {
      throw new BadRequestException(`Недопустимый переход ${current.status} -> ARCHIVED`);
    }
    return this.prisma.collection.update({
      where: { id },
      data: { status: CollectionStatus.ARCHIVED, isActive: false, sourceType: CollectionSourceType.ARCHIVED },
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

  @Get(':id/preview')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async previewById(
    @Param('id') id: string,
    @Query('sort') sort?: 'popularity' | 'availability' | 'balanced' | 'score',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('debugScore') debugScore?: string,
    @Query('compare') compare?: 'before' | 'after',
  ) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Подборка не найдена');

    const limit = Math.min(50, Math.max(1, Number(pageSize ?? 12)));
    const pageNum = Math.max(1, Number(page ?? 1));
    const useDebugScore = debugScore === 'true';
    const sortMode = sort ?? 'balanced';

    const before = await this.selectionService.resolveSelection({
      cityId: collection.cityId,
      filterTags: collection.filterTags,
      filterCategory: collection.filterCategory,
      filterSubcategory: collection.filterSubcategory,
      filterAudience: collection.filterAudience,
      additionalFilters: collection.additionalFilters as Record<string, unknown>,
      ranking: (collection.rankingJson as { preset?: 'popularity' | 'availability' | 'balanced' }) ?? { preset: 'balanced' },
      pinnedEventIds: [],
      excludedEventIds: [],
      limit,
      page: pageNum,
      sort: sortMode,
      debugScore: useDebugScore,
    });

    const after = await this.selectionService.resolveSelection({
      cityId: collection.cityId,
      filterTags: collection.filterTags,
      filterCategory: collection.filterCategory,
      filterSubcategory: collection.filterSubcategory,
      filterAudience: collection.filterAudience,
      additionalFilters: collection.additionalFilters as Record<string, unknown>,
      ranking: (collection.rankingJson as { preset?: 'popularity' | 'availability' | 'balanced' }) ?? { preset: 'balanced' },
      pinnedEventIds: collection.pinnedEventIds,
      excludedEventIds: collection.excludedEventIds,
      limit,
      page: pageNum,
      sort: sortMode,
      debugScore: useDebugScore,
    });

    const beforeIds = new Set(before.items.map((event) => event.id));
    const afterIds = new Set(after.items.map((event) => event.id));
    const added = after.items.filter((event) => !beforeIds.has(event.id)).map((event) => event.id);
    const removed = before.items.filter((event) => !afterIds.has(event.id)).map((event) => event.id);
    const beforeOrder = new Map(before.items.map((event, index) => [event.id, index]));
    const changedOrder = after.items
      .filter((event, index) => beforeOrder.has(event.id) && beforeOrder.get(event.id) !== index)
      .map((event) => event.id);

    const source = compare === 'before' ? before : after;
    return {
      mode: compare ?? 'after',
      eventCount: source.preview.eventCount,
      generatedAt: source.preview.generatedAt,
      weights: source.preview.weights,
      diff: { added, removed, changedOrder },
      items: source.items.map((event) => ({
        id: event.id,
        title: event.title,
        slug: event.slug,
        city: event.city ? { slug: event.city.slug, name: event.city.name } : null,
        rating: event.rating,
        reviewCount: event.reviewCount,
        score: '_selectionScore' in event ? event._selectionScore : undefined,
      })),
    };
  }

  @Get(':id/scoring')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async getScoring(@Param('id') id: string, @Query('pageSize') pageSize?: string) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Подборка не найдена');
    const limit = Math.min(30, Math.max(1, Number(pageSize ?? 10)));
    const resolved = await this.selectionService.resolveSelection({
      cityId: collection.cityId,
      filterTags: collection.filterTags,
      filterCategory: collection.filterCategory,
      filterSubcategory: collection.filterSubcategory,
      filterAudience: collection.filterAudience,
      additionalFilters: collection.additionalFilters as Record<string, unknown>,
      ranking: (collection.rankingJson as { preset?: 'popularity' | 'availability' | 'balanced' }) ?? { preset: 'balanced' },
      pinnedEventIds: collection.pinnedEventIds,
      excludedEventIds: collection.excludedEventIds,
      sort: 'score',
      debugScore: true,
      limit,
      page: 1,
    });
    return {
      collectionId: id,
      weights: resolved.preview.weights,
      items: resolved.items.map((event) => ({
        id: event.id,
        title: event.title,
        score: '_selectionScore' in event ? event._selectionScore : null,
        rating: event.rating,
        reviewCount: event.reviewCount,
      })),
    };
  }
}
