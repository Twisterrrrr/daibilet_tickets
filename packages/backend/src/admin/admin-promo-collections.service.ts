import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PromoCollectionResolverService } from '../promo/promo-collection-resolver.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreatePromoCollectionDto,
  CreatePromoCollectionItemDto,
  UpdatePromoCollectionDto,
  UpdatePromoCollectionItemDto,
  UpsertPromoCollectionRuleDto,
} from './dto/admin-promo-collection.dto';

@Injectable()
export class AdminPromoCollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: PromoCollectionResolverService,
  ) {}

  async list() {
    return this.prisma.promoCollection.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        _count: { select: { items: true, blocks: true } },
      },
    });
  }

  async getById(id: string) {
    return this.prisma.promoCollection.findUniqueOrThrow({
      where: { id },
      include: {
        items: {
          include: { event: { select: { id: true, slug: true, title: true } }, venue: { select: { id: true, slug: true, title: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        rule: true,
        _count: { select: { blocks: true } },
      },
    });
  }

  async create(data: CreatePromoCollectionDto) {
    const slug = data.slug.trim().toLowerCase();
    const existing = await this.prisma.promoCollection.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException(`Promo collection с slug "${slug}" уже существует`);
    }
    return this.prisma.promoCollection.create({
      data: {
        slug,
        title: data.title,
        description: data.description ?? null,
        selectionMode: data.selectionMode,
        contentType: data.contentType,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(id: string, data: UpdatePromoCollectionDto) {
    if (data.slug !== undefined) {
      const slug = (data.slug as string).trim().toLowerCase();
      const existing = await this.prisma.promoCollection.findFirst({ where: { slug, NOT: { id } } });
      if (existing) {
        throw new BadRequestException(`Promo collection с slug "${slug}" уже существует`);
      }
    }
    return this.prisma.promoCollection.update({
      where: { id },
      data: {
        ...(data.slug !== undefined && { slug: (data.slug as string).trim().toLowerCase() }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description ?? null }),
        ...(data.selectionMode !== undefined && { selectionMode: data.selectionMode }),
        ...(data.contentType !== undefined && { contentType: data.contentType }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async remove(id: string) {
    const blocks = await this.prisma.promoBlock.count({ where: { collectionId: id } });
    if (blocks > 0) {
      throw new BadRequestException(`Сначала отвяжите ${blocks} promo block(ов) от этой коллекции`);
    }
    await this.prisma.promoCollection.delete({ where: { id } });
    return { success: true };
  }

  async listItems(collectionId: string) {
    await this.prisma.promoCollection.findUniqueOrThrow({ where: { id: collectionId } });
    return this.prisma.promoCollectionItem.findMany({
      where: { collectionId },
      include: {
        event: { select: { id: true, slug: true, title: true, imageUrl: true } },
        venue: { select: { id: true, slug: true, title: true, imageUrl: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async addItem(collectionId: string, data: CreatePromoCollectionItemDto) {
    const col = await this.prisma.promoCollection.findUniqueOrThrow({
      where: { id: collectionId },
      include: { items: true },
    });
    const expectedType = col.contentType === 'EVENTS' ? 'EVENT' : 'VENUE';
    if (data.itemType !== expectedType) {
      throw new BadRequestException(`Для коллекции с contentType=${col.contentType} добавлять можно только itemType=${expectedType}`);
    }
    const entityId = expectedType === 'EVENT' ? data.eventId : data.venueId;
    if (!entityId?.trim()) {
      throw new BadRequestException(`${expectedType === 'EVENT' ? 'eventId' : 'venueId'} обязателен`);
    }
    const exists = col.items.some(
      (i) => (expectedType === 'EVENT' && i.eventId === entityId) || (expectedType === 'VENUE' && i.venueId === entityId),
    );
    if (exists) {
      throw new BadRequestException('Этот элемент уже есть в коллекции');
    }
    const maxSort = col.items.length ? Math.max(...col.items.map((i) => i.sortOrder)) : -1;
    return this.prisma.promoCollectionItem.create({
      data: {
        collectionId,
        itemType: expectedType,
        eventId: expectedType === 'EVENT' ? entityId : null,
        venueId: expectedType === 'VENUE' ? entityId : null,
        sortOrder: data.sortOrder ?? maxSort + 1,
      },
      include: {
        event: { select: { id: true, slug: true, title: true } },
        venue: { select: { id: true, slug: true, title: true } },
      },
    });
  }

  async updateItem(collectionId: string, itemId: string, data: UpdatePromoCollectionItemDto) {
    await this.prisma.promoCollectionItem.findFirstOrThrow({
      where: { id: itemId, collectionId },
    });
    return this.prisma.promoCollectionItem.update({
      where: { id: itemId },
      data: { ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }) },
      include: {
        event: { select: { id: true, slug: true, title: true } },
        venue: { select: { id: true, slug: true, title: true } },
      },
    });
  }

  async removeItem(collectionId: string, itemId: string) {
    await this.prisma.promoCollectionItem.findFirstOrThrow({
      where: { id: itemId, collectionId },
    });
    await this.prisma.promoCollectionItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  async getRule(collectionId: string) {
    await this.prisma.promoCollection.findUniqueOrThrow({ where: { id: collectionId } });
    return this.prisma.promoCollectionRule.findUnique({
      where: { collectionId },
    });
  }

  async upsertRule(collectionId: string, data: UpsertPromoCollectionRuleDto) {
    const col = await this.prisma.promoCollection.findUniqueOrThrow({ where: { id: collectionId } });
    if (col.selectionMode !== 'AUTO') {
      throw new BadRequestException('Правила применяются только к коллекциям с selectionMode=AUTO');
    }
    const payload: Prisma.PromoCollectionRuleCreateInput = {
      collection: { connect: { id: collectionId } },
      citySlug: data.citySlug ?? null,
      categorySlug: data.categorySlug ?? null,
      tagSlugs: data.tagSlugs ?? [],
      isKids: data.isKids ?? null,
      isIndoor: data.isIndoor ?? null,
      sortMode: data.sortMode ?? 'POPULAR',
      limit: Math.min(Math.max(data.limit ?? 12, 1), 50),
      onlyActive: data.onlyActive ?? true,
      onlyBookable: data.onlyBookable ?? true,
    };
    return this.prisma.promoCollectionRule.upsert({
      where: { collectionId },
      create: payload,
      update: payload,
    });
  }

  async preview(collectionId: string) {
    const col = await this.prisma.promoCollection.findUniqueOrThrow({
      where: { id: collectionId },
      select: { contentType: true },
    });
    if (col.contentType === 'EVENTS') {
      return this.resolver.resolveEvents(collectionId);
    }
    return this.resolver.resolveVenues(collectionId);
  }
}
