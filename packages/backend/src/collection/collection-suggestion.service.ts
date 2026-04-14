import { Injectable } from '@nestjs/common';
import { CollectionSelectionBasis, CollectionSourceType, CollectionStatus, Prisma } from '@/prisma-client';

import { CollectionSelectionService } from '../catalog/collection-selection.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALLOWED_COMBINATIONS,
  ALLOWED_POPULAR_SUGGESTIONS,
  ALLOWED_STRUCTURAL_SUGGESTIONS,
  MIN_EVENTS_FOR_SUGGESTION,
} from './collection-suggestion.config';

type SuggestionSeed = {
  basis: CollectionSelectionBasis;
  tags: string[];
  titleSeed: string;
};

@Injectable()
export class CollectionSuggestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly selection: CollectionSelectionService,
  ) {}

  buildCollectionSemanticKey(cityId: string, filtersJson: unknown): string {
    return `${cityId}:${JSON.stringify(filtersJson)}`;
  }

  async generateCollectionSuggestions() {
    const cities = await this.prisma.city.findMany({ where: { isActive: true }, select: { id: true, slug: true, name: true } });
    let created = 0;
    let updated = 0;

    for (const city of cities) {
      const seeds: SuggestionSeed[] = [
        ...ALLOWED_POPULAR_SUGGESTIONS.map((tag) => ({ basis: CollectionSelectionBasis.POPULAR, tags: [tag], titleSeed: tag })),
        ...ALLOWED_STRUCTURAL_SUGGESTIONS.map((tag) => ({
          basis: CollectionSelectionBasis.STRUCTURAL,
          tags: [tag],
          titleSeed: tag,
        })),
        ...ALLOWED_COMBINATIONS.map((combo) => ({
          basis: CollectionSelectionBasis.COMBINATION,
          tags: [...combo],
          titleSeed: combo.join('-'),
        })),
      ];

      for (const seed of seeds) {
        const filters = { filterTags: seed.tags };
        const semanticKey = this.buildCollectionSemanticKey(city.id, filters);
        const resolved = await this.selection.resolveSelection({
          cityId: city.id,
          filterTags: seed.tags,
          ranking: { preset: 'balanced' },
          page: 1,
          limit: 12,
        });
        if (resolved.preview.eventCount < MIN_EVENTS_FOR_SUGGESTION) continue;

        const existing = await this.prisma.collection.findFirst({
          where: {
            cityId: city.id,
            OR: [{ semanticKey }, { slug: this.buildSlug(city.slug, seed.titleSeed) }],
            isDeleted: false,
          },
        });

        const data: Prisma.CollectionUncheckedCreateInput = {
          cityId: city.id,
          slug: this.buildSlug(city.slug, seed.titleSeed),
          title: this.buildTitle(seed.tags, city.name),
          subtitle: `Автоподборка по сценарию: ${seed.tags.join(' + ')}`,
          sourceType: CollectionSourceType.SUGGESTED,
          status: CollectionStatus.SUGGESTED,
          selectionBasis: seed.basis,
          filterTags: seed.tags,
          pinnedEventIds: [],
          excludedEventIds: [],
          semanticKey,
          rankingJson: { preset: 'balanced' } as Prisma.InputJsonValue,
          eventCountCached: resolved.preview.eventCount,
          previewGeneratedAt: new Date(),
          isActive: false,
        };

        if (!existing) {
          await this.prisma.collection.create({ data });
          created += 1;
          continue;
        }

        if (existing.status === CollectionStatus.ACTIVE || existing.sourceType === CollectionSourceType.MANUAL) {
          continue;
        }

        await this.prisma.collection.update({
          where: { id: existing.id },
          data: {
            ...data,
            sourceType: CollectionSourceType.SUGGESTED,
            status: CollectionStatus.SUGGESTED,
            isActive: false,
          },
        });
        updated += 1;
      }
    }

    return { created, updated };
  }

  private buildSlug(citySlug: string, seed: string): string {
    const normalized = seed
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .replace(/_/g, '-')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `${citySlug}-${normalized}`;
  }

  private buildTitle(tags: string[], cityName: string): string {
    const head = tags.map((t) => t.replace(/_/g, ' ')).join(' + ');
    return `${head} в ${cityName}`;
  }
}
