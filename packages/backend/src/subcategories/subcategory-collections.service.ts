import { createHash } from 'crypto';

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { cacheKeys } from '../cache/cache-keys';
import { CacheService } from '../cache/cache.service';
import { CatalogService } from '../catalog/catalog.service';
import { buildVenueWhere } from '../catalog/where-builders';
import { PrismaService } from '../prisma/prisma.service';
import {
  SUBCATEGORY_COLLECTION_THRESHOLDS,
  subcategoryCollectionCacheTtlSec,
} from './subcategory-collections.constants';
import { SubcategoryPolicyService } from './subcategory-policy.service';

export type SubcategoryCollectionEntityKind = 'EVENT' | 'VENUE';

export interface SubcategoryCollectionParams {
  subcategoryCode: string;
  citySlug?: string;
  cityId?: string;
  page?: number;
  limit?: number;
  /** Обход кэша (админ/preview) */
  nocache?: boolean;
}

export interface SubcategoryCollectionSummary {
  total: number;
  /** Первые N карточек (как в getEvents / venues list) */
  previewItems: unknown[];
  hasEnoughContent: boolean;
  minPreviewReached: boolean;
  subcategory: {
    id: string;
    code: string;
    slug: string;
    nameRu: string;
    type: string;
    isActive: boolean;
    isLandingEnabled: boolean;
  } | null;
}

function stableHash(parts: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 32);
}

@Injectable()
export class SubcategoryCollectionsService {
  constructor(
    private readonly catalog: CatalogService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly subcategoryPolicy: SubcategoryPolicyService,
  ) {}

  /** Резолв справочника по стабильному code (берём первую активную строку с приоритетом EVENT_ONLY/VENUE_ONLY). */
  async findSubcategoryMetaByCode(code: string): Promise<SubcategoryCollectionSummary['subcategory']> {
    const trimmed = code.trim();
    if (!trimmed) return null;

    const rows = await this.prisma.subcategory.findMany({
      where: { code: trimmed, isActive: true },
      select: {
        id: true,
        code: true,
        slug: true,
        nameRu: true,
        type: true,
        isActive: true,
        isLandingEnabled: true,
      },
      orderBy: [{ type: 'asc' }],
      take: 5,
    });
    if (!rows.length) return null;
    const eventFirst = rows.find((r) => r.type === 'EVENT_ONLY');
    const universal = rows.find((r) => r.type === 'UNIVERSAL');
    const venueFirst = rows.find((r) => r.type === 'VENUE_ONLY');
    const picked = eventFirst ?? universal ?? venueFirst ?? rows[0]!;
    return picked;
  }

  /**
   * События по подкатегории: канонический отбор через CatalogService.getEvents
   * (паблишабилити, сеансы, sellable-guard, subcategory links + legacy fallback).
   */
  async getEventCollectionBySubcategory(params: SubcategoryCollectionParams) {
    const {
      subcategoryCode,
      citySlug,
      cityId,
      page = 1,
      limit = 24,
      nocache,
    } = params;

    const hash = stableHash({
      k: 'evt',
      code: subcategoryCode.trim(),
      city: citySlug ?? '',
      cityId: cityId ?? '',
      page,
      limit,
    });
    const cacheKey = cacheKeys.subcategoryCollections.events(hash);
    const ttl = subcategoryCollectionCacheTtlSec();

    const fetcher = () =>
      this.catalog.getEvents({
        subcategory: subcategoryCode.trim(),
        city: cityId ? undefined : citySlug,
        cityId,
        page,
        limit,
        sort: 'popular',
        fields: 'card',
        nocache: nocache ? '1' : undefined,
      });

    if (nocache) {
      return fetcher();
    }
    return this.cache.getOrSet(cacheKey, ttl, fetcher);
  }

  /**
   * Площадки по подкатегории (отдельный поток; без смешивания с событиями в одном списке).
   */
  async getVenueCollectionBySubcategory(params: SubcategoryCollectionParams) {
    const {
      subcategoryCode,
      citySlug,
      cityId,
      page = 1,
      limit = 24,
      nocache,
    } = params;

    const hash = stableHash({
      k: 'venue',
      code: subcategoryCode.trim(),
      city: citySlug ?? '',
      cityId: cityId ?? '',
      page,
      limit,
    });
    const cacheKey = cacheKeys.subcategoryCollections.venues(hash);
    const ttl = subcategoryCollectionCacheTtlSec();

    const fetcher = async () => {
      const subFilter = this.subcategoryPolicy.buildVenueSubcategoryFilter(subcategoryCode);
      const where: Prisma.VenueWhereInput = {
        ...buildVenueWhere({ city: cityId ? undefined : citySlug }),
        ...(cityId ? { cityId } : {}),
        ...subFilter,
      };

      const skip = (Math.max(1, page) - 1) * Math.max(1, Math.min(200, limit));
      const take = Math.max(1, Math.min(200, limit));

      const [items, total] = await Promise.all([
        this.prisma.venue.findMany({
          where,
          orderBy: [{ isFeatured: 'desc' }, { rating: 'desc' }, { reviewCount: 'desc' }],
          skip,
          take,
          select: {
            id: true,
            slug: true,
            title: true,
            shortTitle: true,
            venueType: true,
            imageUrl: true,
            city: { select: { slug: true, name: true } },
            address: true,
            metro: true,
            priceFrom: true,
            rating: true,
            reviewCount: true,
            isFeatured: true,
          },
        }),
        this.prisma.venue.count({ where }),
      ]);

      return {
        items: items.map((v) => ({
          id: v.id,
          slug: v.slug,
          title: v.title,
          shortTitle: v.shortTitle,
          venueType: v.venueType,
          imageUrl: v.imageUrl,
          city: v.city,
          address: v.address,
          metro: v.metro,
          priceFrom: v.priceFrom,
          rating: Number(v.rating),
          reviewCount: v.reviewCount,
          isFeatured: v.isFeatured,
        })),
        total,
        page: Math.max(1, page),
        totalPages: Math.ceil(total / take) || 0,
      };
    };

    if (nocache) {
      return fetcher();
    }
    return this.cache.getOrSet(cacheKey, ttl, fetcher);
  }

  async getEventCollectionSummary(params: SubcategoryCollectionParams): Promise<SubcategoryCollectionSummary> {
    const code = params.subcategoryCode.trim();
    const [meta, page1] = await Promise.all([
      this.findSubcategoryMetaByCode(code),
      this.getEventCollectionBySubcategory({ ...params, page: 1, limit: Math.max(8, params.limit ?? 12) }),
    ]);

    const total = (page1 as { total?: number }).total ?? 0;
    const items = (page1 as { items?: unknown[] }).items ?? [];
    const minP = SUBCATEGORY_COLLECTION_THRESHOLDS.minPreviewItems;

    return {
      total,
      previewItems: items,
      hasEnoughContent: total >= minP,
      minPreviewReached: total >= minP,
      subcategory: meta,
    };
  }

  async getVenueCollectionSummary(params: SubcategoryCollectionParams): Promise<SubcategoryCollectionSummary> {
    const code = params.subcategoryCode.trim();
    const [meta, page1] = await Promise.all([
      this.findSubcategoryMetaByCode(code),
      this.getVenueCollectionBySubcategory({ ...params, page: 1, limit: Math.max(8, params.limit ?? 12) }),
    ]);

    const total = (page1 as { total?: number }).total ?? 0;
    const items = (page1 as { items?: unknown[] }).items ?? [];
    const minP = SUBCATEGORY_COLLECTION_THRESHOLDS.minPreviewItems;

    return {
      total,
      previewItems: items,
      hasEnoughContent: total >= minP,
      minPreviewReached: total >= minP,
      subcategory: meta,
    };
  }
}
