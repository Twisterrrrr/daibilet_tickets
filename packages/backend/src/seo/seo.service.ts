import { Injectable } from '@nestjs/common';
import type { SeoEntityType } from './seo.types';
import type { UpsertSeoMetaDto } from './dto/upsert-seo-meta.dto';
import { TagKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TagSeoRoutingService } from './tag-seo-routing.service';

@Injectable()
export class SeoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tagSeoRouting: TagSeoRoutingService,
  ) {}

  async getSeoMeta(_entityType: SeoEntityType, _entityId: string): Promise<Record<string, unknown> | null> {
    return null;
  }

  async upsertSeoMeta(_entityType: SeoEntityType, _entityId: string, data: UpsertSeoMetaDto): Promise<Record<string, unknown>> {
    return data as unknown as Record<string, unknown>;
  }

  async generateSeoMeta(entityType: SeoEntityType, entityId: string): Promise<Record<string, unknown> | null> {
    if (entityType === 'TAG') {
      const tag = await this.prisma.tag.findUnique({
        where: { id: entityId },
        select: { id: true, slug: true, name: true, tagKind: true },
      });
      if (!tag || !tag.tagKind) return null;
      return {
        entityType,
        entityId,
        generatedAt: new Date().toISOString(),
        routingLayer: tag.tagKind === TagKind.STRUCTURAL ? 'taxonomy' : 'demand',
        slug: tag.slug,
        title: tag.name,
      };
    }
    return null;
  }

  buildTagRoutePreview(query: {
    citySlug: string;
    cityNameRu: string;
    tagSlug: string;
    tagNameRu: string;
    kind: 'STRUCTURAL' | 'POPULAR';
  }) {
    const path = this.tagSeoRouting.buildTagLandingPath(query.citySlug, query.tagSlug, query.kind);
    const meta = this.tagSeoRouting.buildSeoSafeMeta({
      cityNameRu: query.cityNameRu,
      tagNameRu: query.tagNameRu,
      kind: query.kind,
    });
    return {
      path,
      kind: query.kind,
      layer: query.kind === 'STRUCTURAL' ? 'taxonomy' : 'demand',
      ...meta,
    };
  }
}
