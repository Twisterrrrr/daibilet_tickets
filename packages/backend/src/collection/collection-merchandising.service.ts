import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Collection, CollectionSourceType, CollectionStatus, Prisma } from '@prisma/client';

import { CollectionSelectionService } from '../catalog/collection-selection.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CollectionQueryConfig,
  mapQueryConfigSourceToPrisma,
  parseCollectionQueryConfig,
} from './collection-query-config';

function apiError(code: string, message: string) {
  return new BadRequestException({ code, message });
}

type AutoCollectionSlice = Pick<
  Collection,
  | 'cityId'
  | 'filterTags'
  | 'filterCategory'
  | 'filterSubcategory'
  | 'filterAudience'
  | 'additionalFilters'
  | 'rankingJson'
  | 'queryConfig'
>;

@Injectable()
export class CollectionMerchandisingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly selectionService: CollectionSelectionService,
  ) {}

  async getResolvedItemsForAdmin(collectionId: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, isDeleted: false },
    });
    if (!collection) throw new NotFoundException('Подборка не найдена');

    if (collection.sourceType === CollectionSourceType.MANUAL) {
      const items = await this.prisma.collectionItem.findMany({
        where: { collectionId, isExcluded: false },
        orderBy: { sortOrder: 'asc' },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              isActive: true,
              priceFrom: true,
            },
          },
        },
      });
      const rows = items.filter((i) => i.event.isActive).map((i) => ({
        eventId: i.event.id,
        title: i.event.title,
        slug: i.event.slug,
        isActive: i.event.isActive,
        priceFrom: i.event.priceFrom != null ? String(i.event.priceFrom) : null,
      }));
      return { items: rows, total: rows.length };
    }

    let cfg: CollectionQueryConfig | null = null;
    try {
      cfg = parseCollectionQueryConfig(collection.queryConfig);
    } catch {
      throw apiError('INVALID_QUERY_CONFIG', 'Некорректный queryConfig');
    }
    if (!cfg) throw apiError('INVALID_QUERY_CONFIG', 'Для AUTO нужен queryConfig');

    const resolved = await this.resolveAutoSelection(collection, cfg, { adminPreviewMax: cfg.limit ?? 30 });
    return {
      items: resolved.items.map((e) => ({
        eventId: e.id,
        title: e.title,
        slug: e.slug,
        isActive: e.isActive,
        priceFrom: e.priceFrom != null ? String(e.priceFrom) : null,
      })),
      total: resolved.total,
    };
  }

  /** Витрина: пагинация для AUTO по queryConfig (или null — вызывающий код использует legacy selection). */
  async getStorefrontAutoPage(collection: AutoCollectionSlice, page: number, limit: number) {
    let cfg: CollectionQueryConfig | null = null;
    try {
      cfg = parseCollectionQueryConfig(collection.queryConfig);
    } catch {
      return null;
    }
    if (!cfg) return null;

    const resolved = await this.resolveAutoSelection(collection, cfg, { page, limit });
    return { items: resolved.items, total: resolved.total };
  }

  private buildAutoWhereAndOrder(
    collection: AutoCollectionSlice,
    cfg: CollectionQueryConfig,
  ): { where: Prisma.EventWhereInput; orderBy: Prisma.EventOrderByWithRelationInput[] } {
    const cityId = cfg.cityId ?? collection.cityId ?? undefined;
    const filterSubcategory =
      cfg.subcategoryIds && cfg.subcategoryIds.length > 0 ? cfg.subcategoryIds[0] : collection.filterSubcategory;

    const baseWhere = this.selectionService.buildWhere({
      cityId: cityId ?? null,
      filterTags: cfg.tags?.length ? cfg.tags : collection.filterTags,
      filterCategory: collection.filterCategory,
      filterSubcategory,
      filterAudience: collection.filterAudience,
      additionalFilters: (collection.additionalFilters as Record<string, unknown>) ?? undefined,
    });

    const extra: Prisma.EventWhereInput = {};
    const src = mapQueryConfigSourceToPrisma(cfg.source);
    if (src) extra.source = src;
    if (cfg.priceMax != null) {
      extra.priceFrom = { lte: cfg.priceMax };
    }
    if (cfg.isToday) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      extra.sessions = {
        some: { isActive: true, startsAt: { gte: start, lt: end } },
      };
    }

    const where: Prisma.EventWhereInput = { AND: [baseWhere, extra] };

    let orderBy: Prisma.EventOrderByWithRelationInput[] = [{ rating: 'desc' }, { reviewCount: 'desc' }];
    if (cfg.sort === 'PRICE_ASC') orderBy = [{ priceFrom: 'asc' }];
    if (cfg.sort === 'POPULAR') orderBy = [{ reviewCount: 'desc' }, { rating: 'desc' }];
    if (cfg.sort === 'SOONEST') orderBy = [{ createdAt: 'asc' }];

    return { where, orderBy };
  }

  private async resolveAutoSelection(
    collection: AutoCollectionSlice,
    cfg: CollectionQueryConfig,
    opts: { adminPreviewMax?: number; page?: number; limit?: number },
  ) {
    const { where, orderBy } = this.buildAutoWhereAndOrder(collection, cfg);

    if (opts.adminPreviewMax != null) {
      const take = Math.min(100, Math.max(1, opts.adminPreviewMax));
      const [total, events] = await Promise.all([
        this.prisma.event.count({ where }),
        this.prisma.event.findMany({
          where,
          orderBy,
          take,
          select: {
            id: true,
            title: true,
            slug: true,
            isActive: true,
            priceFrom: true,
          },
        }),
      ]);
      return { items: events, total };
    }

    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          isActive: true,
          priceFrom: true,
          imageUrl: true,
          category: true,
          rating: true,
          reviewCount: true,
          durationMinutes: true,
          city: { select: { slug: true, name: true } },
          tags: { include: { tag: true } },
          offers: {
            where: { status: 'ACTIVE', isDeleted: false },
            orderBy: [{ isPrimary: 'desc' }, { priority: 'desc' }],
            select: {
              id: true,
              source: true,
              purchaseType: true,
              priceFrom: true,
              isPrimary: true,
              deeplink: true,
            },
          },
          sessions: {
            where: { isActive: true, startsAt: { gte: new Date() } },
            orderBy: { startsAt: 'asc' },
            take: 3,
            select: { startsAt: true, availableTickets: true },
          },
        },
      }),
    ]);

    return { items: events, total };
  }

  async assertPublishable(collectionId: string) {
    const c = await this.prisma.collection.findFirst({
      where: { id: collectionId, isDeleted: false },
      include: { _count: { select: { items: true } } },
    });
    if (!c) throw apiError('COLLECTION_NOT_FOUND', 'Подборка не найдена');
    const titleOk = c.title.trim().length > 0;
    const slugOk = c.slug.trim().length > 0;
    if (!titleOk || !slugOk) throw apiError('INVALID_COLLECTION_SOURCE_TYPE', 'Нужны title и slug');

    if (c.sourceType === CollectionSourceType.MANUAL || c.sourceType === CollectionSourceType.HYBRID) {
      const n = await this.prisma.collectionItem.count({ where: { collectionId, isExcluded: false } });
      if (n < 1) throw apiError('INVALID_COLLECTION_SOURCE_TYPE', 'Нужен минимум один элемент в подборке');
    }

    if (c.sourceType === CollectionSourceType.AUTO || c.sourceType === CollectionSourceType.HYBRID) {
      let cfg: CollectionQueryConfig | null = null;
      try {
        cfg = parseCollectionQueryConfig(c.queryConfig);
      } catch {
        throw apiError('INVALID_QUERY_CONFIG', 'Некорректный queryConfig');
      }
      if (!cfg) throw apiError('INVALID_QUERY_CONFIG', 'Для AUTO/HYBRID нужен валидный queryConfig');
      const { total } = await this.resolveAutoSelection(c, cfg, { adminPreviewMax: 50 });
      if (total < 1) throw apiError('INVALID_QUERY_CONFIG', 'По правилам подборки нет ни одного события');
    }
  }

  async addItem(collectionId: string, eventId: string) {
    const collection = await this.prisma.collection.findFirst({ where: { id: collectionId, isDeleted: false } });
    if (!collection) throw new NotFoundException('Подборка не найдена');

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, isDeleted: false },
      select: { id: true, cityId: true },
    });
    if (!event) throw new NotFoundException('Событие не найдено');

    if (collection.cityId && event.cityId !== collection.cityId) {
      throw apiError('INVALID_CITY', 'Событие не относится к городу подборки');
    }

    const dup = await this.prisma.collectionItem.findUnique({
      where: { collectionId_eventId: { collectionId, eventId } },
    });
    if (dup) throw apiError('COLLECTION_ITEM_ALREADY_EXISTS', 'Событие уже в подборке');

    const maxOrder = await this.prisma.collectionItem.aggregate({
      where: { collectionId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    await this.prisma.$transaction(async (tx) => {
      await tx.collectionItem.create({
        data: { collectionId, eventId, sortOrder: nextOrder },
      });
      await this.syncPinnedIdsTx(tx, collectionId);
      await tx.collection.update({
        where: { id: collectionId },
        data: { version: { increment: 1 } },
      });
    });

    return this.prisma.collectionItem.findFirst({
      where: { collectionId, eventId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            city: { select: { id: true, name: true, slug: true } },
            isActive: true,
            source: true,
            priceFrom: true,
          },
        },
      },
    });
  }

  async removeItem(collectionId: string, itemId: string) {
    const item = await this.prisma.collectionItem.findFirst({ where: { id: itemId, collectionId } });
    if (!item) throw new NotFoundException('Элемент не найден');

    await this.prisma.$transaction(async (tx) => {
      await tx.collectionItem.delete({ where: { id: itemId } });
      await this.syncPinnedIdsTx(tx, collectionId);
      await tx.collection.update({
        where: { id: collectionId },
        data: { version: { increment: 1 } },
      });
    });
    return { ok: true };
  }

  async reorderItems(collectionId: string, itemIdsInOrder: string[]) {
    const existing = await this.prisma.collectionItem.findMany({
      where: { collectionId },
      select: { id: true },
    });
    const idSet = new Set(existing.map((x) => x.id));
    if (itemIdsInOrder.length !== idSet.size || itemIdsInOrder.some((id) => !idSet.has(id))) {
      throw apiError('COLLECTION_REORDER_INVALID', 'Список id не совпадает с элементами подборки');
    }

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < itemIdsInOrder.length; i++) {
        await tx.collectionItem.update({
          where: { id: itemIdsInOrder[i] },
          data: { sortOrder: i },
        });
      }
      await this.syncPinnedIdsTx(tx, collectionId);
      await tx.collection.update({
        where: { id: collectionId },
        data: { version: { increment: 1 } },
      });
    });
    return { ok: true };
  }

  private async syncPinnedIdsTx(tx: Prisma.TransactionClient, collectionId: string) {
    const rows = await tx.collectionItem.findMany({
      where: { collectionId },
      orderBy: { sortOrder: 'asc' },
      select: { eventId: true },
    });
    await tx.collection.update({
      where: { id: collectionId },
      data: { pinnedEventIds: rows.map((r) => r.eventId) },
    });
  }

  /** Применить публикацию: ACTIVE + publishedAt при первом разе */
  async applyPublishTransition(collectionId: string, toStatus: CollectionStatus) {
    if (toStatus !== CollectionStatus.ACTIVE) return { publishedAt: null as Date | null };

    await this.assertPublishable(collectionId);

    const cur = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      select: { publishedAt: true },
    });
    const publishedAt = cur?.publishedAt ?? new Date();
    await this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        status: CollectionStatus.ACTIVE,
        isActive: true,
        sourceType: CollectionSourceType.ACTIVE,
        publishedAt,
      },
    });
    return { publishedAt };
  }
}
