import { Injectable } from '@nestjs/common';
import { Prisma, PromoBlockStatus, PromoPageScopeType, PromoPlacementZone, PromoTargetType } from '@/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

export type PublicPromoPlacementContext = {
  placementZone: PromoPlacementZone;
  pageScopeType: PromoPageScopeType;
  cityId?: string;
  landingId?: string;
  collectionId?: string;
  articleId?: string;
  now?: Date;
  limit?: number;
};

export type PublicPromoPlacementResolvedItem = {
  id: string;
  title: string;
  placementZone: PromoPlacementZone;
  pageScopeType: PromoPageScopeType;
  targetType: PromoTargetType;
  targetSummary: { id: string; title: string; slug: string } | null;
  customTitle: string | null;
  customSubtitle: string | null;
  customImageUrl: string | null;
  ctaLabel: string | null;
  priority: number;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  preview: { resolvedUrl: string | null; displayTitle: string; displaySubtitle: string | null; displayImageUrl: string | null };
};

@Injectable()
export class PromoPlacementBlocksPublicService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(ctx: PublicPromoPlacementContext): Promise<PublicPromoPlacementResolvedItem[]> {
    const now = ctx.now ?? new Date();
    const limit = Math.min(50, Math.max(1, ctx.limit ?? 10));

    const where: Prisma.PromoPlacementBlockWhereInput = {
      placementZone: ctx.placementZone,
      pageScopeType: ctx.pageScopeType,
      status: PromoBlockStatus.PUBLISHED,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    };

    // Context match must be truthful: only return blocks that match the provided scope context.
    if (ctx.pageScopeType === PromoPageScopeType.GLOBAL) {
      where.cityId = null;
      where.landingId = null;
      where.collectionId = null;
      where.articleId = null;
    }
    if (ctx.pageScopeType === PromoPageScopeType.CITY) where.cityId = ctx.cityId ?? '__missing__';
    if (ctx.pageScopeType === PromoPageScopeType.LANDING) where.landingId = ctx.landingId ?? '__missing__';
    if (ctx.pageScopeType === PromoPageScopeType.COLLECTION) where.collectionId = ctx.collectionId ?? '__missing__';
    if (ctx.pageScopeType === PromoPageScopeType.ARTICLE) where.articleId = ctx.articleId ?? '__missing__';

    const rows = await this.prisma.promoPlacementBlock.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
      take: limit,
      include: {
        targetEvent: { select: { id: true, title: true, slug: true } },
        targetCollection: { select: { id: true, title: true, slug: true } },
        targetLanding: { select: { id: true, title: true, slug: true, city: { select: { slug: true } } } },
        targetArticle: { select: { id: true, title: true, slug: true } },
      },
    });

    return rows.map((r) => this.toResolved(r));
  }

  private toResolved(
    r: Prisma.PromoPlacementBlockGetPayload<{
      include: {
        targetEvent: { select: { id: true; title: true; slug: true } };
        targetCollection: { select: { id: true; title: true; slug: true } };
        targetLanding: { select: { id: true; title: true; slug: true; city: { select: { slug: true } } } };
        targetArticle: { select: { id: true; title: true; slug: true } };
      };
    }>,
  ): PublicPromoPlacementResolvedItem {
    const target =
      r.targetType === PromoTargetType.EVENT
        ? r.targetEvent
        : r.targetType === PromoTargetType.COLLECTION
          ? r.targetCollection
          : r.targetType === PromoTargetType.LANDING
            ? r.targetLanding
            : r.targetArticle;

    const displayTitle =
      (r.customTitle ?? '').trim() ||
      (r.targetType === PromoTargetType.EVENT ? r.targetEvent?.title : null) ||
      (r.targetType === PromoTargetType.COLLECTION ? r.targetCollection?.title : null) ||
      (r.targetType === PromoTargetType.LANDING ? r.targetLanding?.title : null) ||
      (r.targetType === PromoTargetType.ARTICLE ? r.targetArticle?.title : null) ||
      r.title;

    const displaySubtitle = (r.customSubtitle ?? '').trim() || null;
    const displayImageUrl = (r.customImageUrl ?? '').trim() || null;

    const resolvedUrl =
      r.targetType === PromoTargetType.EVENT
        ? r.targetEvent?.slug
          ? `/events/${encodeURIComponent(r.targetEvent.slug)}`
          : null
        : r.targetType === PromoTargetType.COLLECTION
          ? r.targetCollection?.slug
            ? `/collections/${encodeURIComponent(r.targetCollection.slug)}`
            : null
          : r.targetType === PromoTargetType.ARTICLE
            ? r.targetArticle?.slug
              ? `/articles/${encodeURIComponent(r.targetArticle.slug)}`
              : null
            : r.targetLanding?.slug && r.targetLanding.city?.slug
              ? `/cities/${encodeURIComponent(r.targetLanding.city.slug)}/${encodeURIComponent(r.targetLanding.slug)}`
              : null;

    return {
      id: r.id,
      title: r.title,
      placementZone: r.placementZone,
      pageScopeType: r.pageScopeType,
      targetType: r.targetType,
      targetSummary: target ? { id: target.id, title: (target as { title: string }).title, slug: (target as { slug: string }).slug } : null,
      customTitle: r.customTitle,
      customSubtitle: r.customSubtitle,
      customImageUrl: r.customImageUrl,
      ctaLabel: r.ctaLabel,
      priority: r.priority,
      sortOrder: r.sortOrder,
      startsAt: r.startsAt ? r.startsAt.toISOString() : null,
      endsAt: r.endsAt ? r.endsAt.toISOString() : null,
      preview: { resolvedUrl, displayTitle, displaySubtitle, displayImageUrl },
    };
  }
}

