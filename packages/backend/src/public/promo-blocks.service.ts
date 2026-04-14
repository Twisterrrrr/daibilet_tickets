import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@/prisma-client';
import { PromoCollectionResolverService } from '../promo/promo-collection-resolver.service';
import { PrismaService } from '../prisma/prisma.service';

const PROMO_LOG = {
  blockSkipped: 'promo.block.skipped',
  blockInvalid: 'promo.block.invalid',
  collectionEmpty: 'promo.collection.empty',
} as const;

export interface PublicPromoBlockDto {
  slug: string;
  title: string;
  description: string;
  href: string;
  iconSource: string;
  iconKey: string | null;
  iconSvg: string | null;
  bgMode: string;
  bgColor: string | null;
  gradientFrom: string | null;
  gradientTo: string | null;
}

@Injectable()
export class PromoBlocksPublicService {
  private readonly logger = new Logger(PromoBlocksPublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: PromoCollectionResolverService,
  ) {}

  async list(citySlug?: string): Promise<PublicPromoBlockDto[]> {
    const now = new Date();
    const cityFilter: Prisma.PromoBlockWhereInput = citySlug
      ? {
          OR: [
            { targetCitySlugs: { equals: [] } },
            { targetCitySlugs: { has: citySlug.toLowerCase() } },
          ],
        }
      : { targetCitySlugs: { equals: [] } };

    const where: Prisma.PromoBlockWhereInput = {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        cityFilter,
      ],
    };

    const blocks = await this.prisma.promoBlock.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      select: {
        slug: true,
        title: true,
        description: true,
        href: true,
        contentMode: true,
        collectionId: true,
        collection: { select: { slug: true, isActive: true } },
        iconSource: true,
        iconKey: true,
        iconSvg: true,
        bgMode: true,
        bgColor: true,
        gradientFrom: true,
        gradientTo: true,
      },
    });

    const valid: typeof blocks = [];
    for (const b of blocks) {
      const reason = await this.validatePromoBlockRuntime(b);
      if (reason) {
        this.logger.warn(`Invalid promo block skipped`, {
          code: PROMO_LOG.blockSkipped,
          slug: b.slug,
          reason,
        });
        continue;
      }
      valid.push(b);
    }

    return valid.map((b) => {
      let href: string;
      if (b.href && b.href.trim()) {
        href = b.href.trim();
      } else if (b.contentMode === 'COLLECTION' && b.collection?.slug) {
        href = `/promo/${b.collection.slug}`;
      } else {
        href = '/events';
      }
      return {
        slug: b.slug,
        title: b.title,
        description: b.description,
        href,
        iconSource: b.iconSource,
        iconKey: b.iconKey,
        iconSvg: b.iconSvg,
        bgMode: b.bgMode,
        bgColor: b.bgColor,
        gradientFrom: b.gradientFrom,
        gradientTo: b.gradientTo,
      };
    }) as PublicPromoBlockDto[];
  }

  async getCollectionBySlug(slug: string) {
    const col = await this.prisma.promoCollection.findUnique({
      where: { slug, isActive: true },
      select: { id: true, slug: true, title: true, description: true, contentType: true },
    });
    if (!col) return null;
    if (col.contentType === 'EVENTS') {
      const events = await this.resolver.resolveEvents(col.id);
      return { ...col, events };
    }
    const venues = await this.resolver.resolveVenues(col.id);
    return { ...col, venues };
  }

  async getItemsByBlockSlug(slug: string): Promise<{ events?: unknown[]; venues?: unknown[] }> {
    const block = await this.prisma.promoBlock.findUnique({
      where: { slug },
      select: { contentMode: true, collectionId: true },
    });
    if (!block) throw new NotFoundException('Promo block not found');
    if (block.contentMode !== 'COLLECTION' || !block.collectionId) {
      return { events: [], venues: [] };
    }
    const col = await this.prisma.promoCollection.findUnique({
      where: { id: block.collectionId },
      select: { contentType: true },
    });
    if (!col) return { events: [], venues: [] };
    if (col.contentType === 'EVENTS') {
      const events = await this.resolver.resolveEvents(block.collectionId);
      return { events };
    }
    const venues = await this.resolver.resolveVenues(block.collectionId);
    return { venues };
  }

  /**
   * Runtime validation: блок не должен попадать в public API, если:
   * - title пуст
   * - LINK_ONLY и href пуст
   * - COLLECTION: collection не существует или неактивна
   * - COLLECTION: resolver возвращает 0 items
   */
  private async validatePromoBlockRuntime(
    b: {
      slug: string;
      title: string | null;
      href: string | null;
      contentMode: string;
      collectionId: string | null;
      collection: { slug: string; isActive: boolean } | null;
    },
  ): Promise<string | null> {
    const title = (b.title ?? '').trim();
    if (!title) return 'title_empty';

    if (b.contentMode === 'LINK_ONLY') {
      const href = (b.href ?? '').trim();
      if (!href) return 'link_only_href_empty';
      return null;
    }

    if (b.contentMode === 'COLLECTION') {
      if (!b.collectionId) return 'collection_missing_id';
      if (!b.collection) return 'collection_not_found';
      if (!b.collection.isActive) return 'collection_inactive';

      const col = await this.prisma.promoCollection.findUnique({
        where: { id: b.collectionId },
        select: { contentType: true },
      });
      if (!col) return 'collection_not_found';

      if (col.contentType === 'EVENTS') {
        const events = await this.resolver.resolveEvents(b.collectionId);
        if (events.length === 0) {
          this.logger.warn(`Promo collection empty`, {
            code: PROMO_LOG.collectionEmpty,
            slug: b.slug,
            collectionId: b.collectionId,
          });
          return 'collection_empty';
        }
      } else {
        const venues = await this.resolver.resolveVenues(b.collectionId);
        if (venues.length === 0) {
          this.logger.warn(`Promo collection empty`, {
            code: PROMO_LOG.collectionEmpty,
            slug: b.slug,
            collectionId: b.collectionId,
          });
          return 'collection_empty';
        }
      }
      return null;
    }

    return null;
  }
}
