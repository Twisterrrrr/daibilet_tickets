import { Injectable, Logger } from '@nestjs/common';
import { CollectionSelectionBasis, CollectionSourceType } from '@prisma/client';

import { CollectionSelectionService } from '../catalog/collection-selection.service';
import { PrismaService } from '../prisma/prisma.service';
import { MIN_EVENTS_FOR_SUGGESTION } from './collection-suggestion.config';

export interface CollectionMaterializeResult {
  processed: number;
  beforeVisible: number;
  visible: number;
  hidden: number;
  updated: number;
  unchanged: number;
  skipped: number;
  changedSlugs: string[];
  details: { id: string; slug: string; citySlug: string; count: number; minEvents: number; isActive: boolean }[];
}

/**
 * Materializer — пересчёт isActive коллекций по порогу событий.
 * visible = eventCount >= MIN_EVENTS_FOR_SUGGESTION
 * Применяется только к коллекциям с sourceType SUGGESTED/ACTIVE и selectionBasis != MANUAL.
 *
 * @see docs/Collections-Architecture.md
 */
@Injectable()
export class CollectionMaterializerService {
  private readonly logger = new Logger(CollectionMaterializerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly selection: CollectionSelectionService,
  ) {}

  async materialize(): Promise<CollectionMaterializeResult> {
    const details: CollectionMaterializeResult['details'] = [];
    const changedSlugs: string[] = [];
    let activated = 0;
    let deactivated = 0;
    let skipped = 0;
    let beforeVisible = 0;

    const collections = await this.prisma.collection.findMany({
      where: {
        isDeleted: false,
        cityId: { not: null },
        sourceType: { in: [CollectionSourceType.SUGGESTED, CollectionSourceType.ACTIVE] },
        selectionBasis: { in: [CollectionSelectionBasis.POPULAR, CollectionSelectionBasis.STRUCTURAL, CollectionSelectionBasis.COMBINATION] },
      },
      select: {
        id: true,
        slug: true,
        cityId: true,
        filterTags: true,
        filterCategory: true,
        filterSubcategory: true,
        filterAudience: true,
        additionalFilters: true,
        rankingJson: true,
        pinnedEventIds: true,
        excludedEventIds: true,
        isActive: true,
        city: { select: { slug: true } },
      },
    });

    for (const col of collections) {
      if (!col.cityId || !col.city) {
        skipped++;
        continue;
      }
      if (col.isActive) beforeVisible++;

      const resolved = await this.selection.resolveSelection({
        cityId: col.cityId,
        filterTags: col.filterTags,
        filterCategory: col.filterCategory,
        filterSubcategory: col.filterSubcategory,
        filterAudience: col.filterAudience,
        additionalFilters: col.additionalFilters as Record<string, unknown>,
        ranking: (col.rankingJson as { preset?: 'popularity' | 'availability' | 'balanced' }) ?? { preset: 'balanced' },
        pinnedEventIds: col.pinnedEventIds,
        excludedEventIds: col.excludedEventIds,
        page: 1,
        limit: 1,
      });

      const count = resolved.preview.eventCount;
      const shouldBeActive = count >= MIN_EVENTS_FOR_SUGGESTION;

      details.push({
        id: col.id,
        slug: col.slug,
        citySlug: col.city.slug,
        count,
        minEvents: MIN_EVENTS_FOR_SUGGESTION,
        isActive: shouldBeActive,
      });

      if (col.isActive !== shouldBeActive) {
        await this.prisma.collection.update({
          where: { id: col.id },
          data: {
            isActive: shouldBeActive,
            eventCountCached: count,
            previewGeneratedAt: new Date(),
          },
        });
        if (shouldBeActive) activated++;
        else deactivated++;
        changedSlugs.push(`${col.city.slug}/${col.slug}`);
      }
    }

    const visible = details.filter((d) => d.isActive).length;
    const hidden = details.filter((d) => !d.isActive).length;
    const updated = activated + deactivated;
    const unchanged = details.length - updated;

    this.logger.log(
      `Collection materializer done: beforeVisible=${beforeVisible}, visible=${visible}, hidden=${hidden}, updated=${updated}, unchanged=${unchanged}, skipped=${skipped}`,
    );

    return {
      processed: details.length,
      beforeVisible,
      visible,
      hidden,
      updated,
      unchanged,
      skipped,
      changedSlugs,
      details,
    };
  }
}
