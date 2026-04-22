import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminContentWriteValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Article ↔ Landing links payload validation (existence, not deleted, no duplicates, normalized position). */
  async validateArticleLandingLinks(
    landingLinks: Array<{ landingId: string; position?: number | null }> | undefined,
    context: string,
  ) {
    if (landingLinks === undefined) return;

    const ids = landingLinks.map((l) => l.landingId).filter(Boolean);
    const uniq = [...new Set(ids)];
    if (uniq.length !== ids.length) {
      throw new BadRequestException({ code: 'DUPLICATE_LANDING_LINKS', context });
    }

    if (uniq.length === 0) return;

    const rows = await this.prisma.landingPage.findMany({
      where: { id: { in: uniq } },
      select: { id: true, isDeleted: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r] as const));
    const missing = uniq.filter((id) => !byId.has(id));
    const deleted = rows.filter((r) => r.isDeleted).map((r) => r.id);
    if (missing.length) {
      throw new BadRequestException({ code: 'LANDING_LINK_TARGET_NOT_FOUND', context, missing: missing.slice(0, 50) });
    }
    if (deleted.length) {
      throw new BadRequestException({ code: 'LANDING_LINK_TARGET_DELETED', context, deleted: deleted.slice(0, 50) });
    }
  }

  /** Article ↔ Collection links payload validation (existence, not deleted, no duplicates, normalized position). */
  async validateArticleCollectionLinks(
    collectionLinks: Array<{ collectionId: string; position?: number | null }> | undefined,
    context: string,
  ) {
    if (collectionLinks === undefined) return;

    const ids = collectionLinks.map((l) => l.collectionId).filter(Boolean);
    const uniq = [...new Set(ids)];
    if (uniq.length !== ids.length) {
      throw new BadRequestException({ code: 'DUPLICATE_COLLECTION_LINKS', context });
    }

    if (uniq.length === 0) return;

    const rows = await this.prisma.collection.findMany({
      where: { id: { in: uniq } },
      select: { id: true, isDeleted: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r] as const));
    const missing = uniq.filter((id) => !byId.has(id));
    const deleted = rows.filter((r) => r.isDeleted).map((r) => r.id);
    if (missing.length) {
      throw new BadRequestException({ code: 'COLLECTION_LINK_TARGET_NOT_FOUND', context, missing: missing.slice(0, 50) });
    }
    if (deleted.length) {
      throw new BadRequestException({ code: 'COLLECTION_LINK_TARGET_DELETED', context, deleted: deleted.slice(0, 50) });
    }
  }

  /** LandingPage filterTag validation and slug/id resolution (domain errors, not FK failures). */
  async validateLandingFilterTag(input: { filterTagId?: unknown; filterTag?: unknown }, context: string) {
    const filterTagId = typeof input.filterTagId === 'string' && input.filterTagId ? input.filterTagId : null;
    const filterTag = typeof input.filterTag === 'string' && input.filterTag ? input.filterTag : null;

    if (filterTagId) {
      const tag = await this.prisma.tag.findUnique({
        where: { id: filterTagId },
        select: { id: true, slug: true, isDeleted: true, isActive: true },
      });
      if (!tag) throw new BadRequestException({ code: 'FILTER_TAG_ID_NOT_FOUND', context });
      if (tag.isDeleted || !tag.isActive) throw new BadRequestException({ code: 'FILTER_TAG_ID_INVALID', context });
      return { filterTagId: tag.id, filterTag: filterTag ?? tag.slug ?? null };
    }

    if (filterTag) {
      const tags = await this.prisma.tag.findMany({
        where: { slug: filterTag, isActive: true },
        select: { id: true, isDeleted: true },
        take: 2,
      });
      if (tags.length === 0) throw new BadRequestException({ code: 'FILTER_TAG_SLUG_NOT_FOUND', context, slug: filterTag });
      if (tags.length > 1) throw new BadRequestException({ code: 'FILTER_TAG_SLUG_AMBIGUOUS', context, slug: filterTag });
      const t = tags[0]!;
      if (t.isDeleted) throw new BadRequestException({ code: 'FILTER_TAG_SLUG_INVALID', context, slug: filterTag });
      return { filterTagId: t.id, filterTag };
    }

    return { filterTagId: null, filterTag: null };
  }

  /** Collection.filterTags legacy slug[] validation (domain errors). */
  async validateCollectionFilterTagSlugs(slugs: string[] | undefined, context: string) {
    if (!slugs || slugs.length === 0) return;
    const norm = slugs.filter((s) => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim());
    const uniq = [...new Set(norm)];
    if (uniq.length !== norm.length) {
      throw new BadRequestException({ code: 'DUPLICATE_FILTER_TAGS', context });
    }
    const tags = await this.prisma.tag.findMany({
      where: { slug: { in: uniq }, isActive: true },
      select: { slug: true, isDeleted: true },
    });
    const bySlug = new Map(tags.map((t) => [t.slug, t] as const));
    const missing = uniq.filter((s) => !bySlug.has(s));
    const deleted = tags.filter((t) => t.isDeleted).map((t) => t.slug);
    if (missing.length) throw new BadRequestException({ code: 'FILTER_TAGS_SLUG_NOT_FOUND', context, missing: missing.slice(0, 50) });
    if (deleted.length) throw new BadRequestException({ code: 'FILTER_TAGS_SLUG_INVALID', context, deleted: deleted.slice(0, 50) });
  }

  /** CollectionTagFilter normalized tagId[] validation (existence, active, not deleted, no duplicates). */
  async validateCollectionTagFilterIds(tagIds: string[] | undefined, context: string) {
    if (!tagIds || tagIds.length === 0) return;
    const norm = tagIds.filter((s) => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim());
    const uniq = [...new Set(norm)];
    if (uniq.length !== norm.length) {
      throw new BadRequestException({ code: 'DUPLICATE_TAG_FILTERS', context });
    }
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: uniq } },
      select: { id: true, isDeleted: true, isActive: true },
    });
    const byId = new Map(tags.map((t) => [t.id, t] as const));
    const missing = uniq.filter((id) => !byId.has(id));
    const invalid = tags.filter((t) => t.isDeleted || !t.isActive).map((t) => t.id);
    if (missing.length) throw new BadRequestException({ code: 'TAG_FILTER_IDS_NOT_FOUND', context, missing: missing.slice(0, 50) });
    if (invalid.length) throw new BadRequestException({ code: 'TAG_FILTER_IDS_INVALID', context, invalid: invalid.slice(0, 50) });
  }
}
