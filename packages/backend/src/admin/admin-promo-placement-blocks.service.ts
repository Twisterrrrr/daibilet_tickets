import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';
import { PromoBlockStatus, PromoPageScopeType, PromoTargetType } from '@/prisma-client';
import type {
  AdminPromoPlacementBlocksQueryDto,
  CreatePromoPlacementBlockDto,
  UpdatePromoPlacementBlockDto,
} from './dto/admin-promo-placement-block.dto';

function isActiveNow(status: PromoBlockStatus, startsAt: Date | null, endsAt: Date | null, now: Date): boolean {
  if (status !== PromoBlockStatus.PUBLISHED) return false;
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}

@Injectable()
export class AdminPromoPlacementBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminPromoPlacementBlocksQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Prisma.PromoPlacementBlockWhereInput = {};

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [{ title: { contains: s, mode: 'insensitive' } }, { customTitle: { contains: s, mode: 'insensitive' } }];
    }
    if (query.status) where.status = query.status;
    if (query.placementZone) where.placementZone = query.placementZone;
    if (query.pageScopeType) where.pageScopeType = query.pageScopeType;
    if (query.cityId) where.cityId = query.cityId;
    if (query.landingId) where.landingId = query.landingId;
    if (query.collectionId) where.collectionId = query.collectionId;
    if (query.articleId) where.articleId = query.articleId;
    if (query.targetType) where.targetType = query.targetType;

    const sortField = query.sort ?? 'updatedAt';
    const order: Prisma.SortOrder = query.order ?? 'desc';
    const orderBy: Prisma.PromoPlacementBlockOrderByWithRelationInput[] =
      sortField === 'priority'
        ? [{ priority: order }, { sortOrder: 'asc' }, { updatedAt: 'desc' }]
        : sortField === 'sortOrder'
          ? [{ sortOrder: order }, { priority: 'desc' }, { updatedAt: 'desc' }]
          : sortField === 'publishedAt'
            ? [{ publishedAt: order }, { updatedAt: 'desc' }]
            : sortField === 'title'
              ? [{ title: order }, { updatedAt: 'desc' }]
              : [{ updatedAt: order }];

    const [total, rows] = await Promise.all([
      this.prisma.promoPlacementBlock.count({ where }),
      this.prisma.promoPlacementBlock.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          city: { select: { id: true, name: true, slug: true } },
          landing: { select: { id: true, title: true, slug: true, city: { select: { slug: true, name: true } } } },
          collection: { select: { id: true, title: true, slug: true } },
          article: { select: { id: true, title: true, slug: true } },
          targetEvent: { select: { id: true, title: true, slug: true, isActive: true, isDeleted: true } },
          targetCollection: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true } },
          targetLanding: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true, city: { select: { slug: true, name: true } } } },
          targetArticle: { select: { id: true, title: true, slug: true, status: true, publishedAt: true } },
        },
      }),
    ]);

    return {
      page,
      limit,
      total,
      items: rows.map((r) => this.toListItem(r)),
    };
  }

  async getById(id: string) {
    const row = await this.prisma.promoPlacementBlock.findUnique({
      where: { id },
      include: {
        city: { select: { id: true, name: true, slug: true } },
        landing: { select: { id: true, title: true, slug: true, city: { select: { id: true, slug: true, name: true } } } },
        collection: { select: { id: true, title: true, slug: true } },
        article: { select: { id: true, title: true, slug: true } },
        targetEvent: { select: { id: true, title: true, slug: true, isActive: true, isDeleted: true } },
        targetCollection: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true } },
        targetLanding: { select: { id: true, title: true, slug: true, status: true, isActive: true, isDeleted: true, city: { select: { slug: true, name: true } } } },
        targetArticle: { select: { id: true, title: true, slug: true, status: true, publishedAt: true } },
      },
    });
    if (!row) throw new NotFoundException('Promo block not found');
    return this.toDetail(row);
  }

  async create(data: CreatePromoPlacementBlockDto) {
    const normalized = this.normalizeDates(data.startsAt ?? null, data.endsAt ?? null);
    this.validateScope(data.pageScopeType, data);
    this.validateTarget(data.targetType, data);
    await this.validateTargetExistsAndPublishable(data.targetType, data);

    return this.prisma.promoPlacementBlock.create({
      data: {
        title: data.title,
        status: PromoBlockStatus.DRAFT,
        placementZone: data.placementZone,
        pageScopeType: data.pageScopeType,
        cityId: data.cityId ?? null,
        landingId: data.landingId ?? null,
        collectionId: data.collectionId ?? null,
        articleId: data.articleId ?? null,
        targetType: data.targetType,
        targetEventId: data.targetEventId ?? null,
        targetCollectionId: data.targetCollectionId ?? null,
        targetLandingId: data.targetLandingId ?? null,
        targetArticleId: data.targetArticleId ?? null,
        customTitle: data.customTitle ?? null,
        customSubtitle: data.customSubtitle ?? null,
        customImageUrl: data.customImageUrl ?? null,
        ctaLabel: data.ctaLabel ?? null,
        priority: data.priority ?? 0,
        sortOrder: data.sortOrder ?? 0,
        startsAt: normalized.startsAt,
        endsAt: normalized.endsAt,
      },
    });
  }

  async update(id: string, data: UpdatePromoPlacementBlockDto) {
    const current = await this.prisma.promoPlacementBlock.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Promo block not found');

    const nextScopeType = data.pageScopeType ?? current.pageScopeType;
    const nextTargetType = data.targetType ?? current.targetType;
    const normalized = this.normalizeDates(
      data.startsAt !== undefined ? data.startsAt : current.startsAt?.toISOString() ?? null,
      data.endsAt !== undefined ? data.endsAt : current.endsAt?.toISOString() ?? null,
    );

    const mergedForValidation = {
      ...current,
      ...data,
      startsAt: normalized.startsAt,
      endsAt: normalized.endsAt,
      pageScopeType: nextScopeType,
      targetType: nextTargetType,
    } as unknown as Record<string, unknown>;

    this.validateScope(nextScopeType, mergedForValidation);
    this.validateTarget(nextTargetType, mergedForValidation);
    await this.validateTargetExistsAndPublishable(nextTargetType, mergedForValidation);

    const patch: Prisma.PromoPlacementBlockUpdateInput = {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.placementZone !== undefined ? { placementZone: data.placementZone } : {}),
      ...(data.pageScopeType !== undefined ? { pageScopeType: data.pageScopeType } : {}),
      ...(data.cityId !== undefined ? { cityId: data.cityId } : {}),
      ...(data.landingId !== undefined ? { landingId: data.landingId } : {}),
      ...(data.collectionId !== undefined ? { collectionId: data.collectionId } : {}),
      ...(data.articleId !== undefined ? { articleId: data.articleId } : {}),
      ...(data.targetType !== undefined ? { targetType: data.targetType } : {}),
      ...(data.targetEventId !== undefined ? { targetEventId: data.targetEventId } : {}),
      ...(data.targetCollectionId !== undefined ? { targetCollectionId: data.targetCollectionId } : {}),
      ...(data.targetLandingId !== undefined ? { targetLandingId: data.targetLandingId } : {}),
      ...(data.targetArticleId !== undefined ? { targetArticleId: data.targetArticleId } : {}),
      ...(data.customTitle !== undefined ? { customTitle: data.customTitle } : {}),
      ...(data.customSubtitle !== undefined ? { customSubtitle: data.customSubtitle } : {}),
      ...(data.customImageUrl !== undefined ? { customImageUrl: data.customImageUrl } : {}),
      ...(data.ctaLabel !== undefined ? { ctaLabel: data.ctaLabel } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.startsAt !== undefined || data.endsAt !== undefined
        ? { startsAt: normalized.startsAt, endsAt: normalized.endsAt }
        : {}),
    };

    if (data.status === PromoBlockStatus.PUBLISHED) {
      if (!current.publishedAt) {
        patch.publishedAt = new Date();
      }
    }

    return this.prisma.promoPlacementBlock.update({ where: { id }, data: patch });
  }

  private validateScope(scopeType: PromoPageScopeType, data: Record<string, unknown>) {
    const cityId = (data.cityId ?? null) as string | null;
    const landingId = (data.landingId ?? null) as string | null;
    const collectionId = (data.collectionId ?? null) as string | null;
    const articleId = (data.articleId ?? null) as string | null;

    if (scopeType === PromoPageScopeType.GLOBAL) {
      if (cityId || landingId || collectionId || articleId) {
        throw new BadRequestException('Для GLOBAL scope контекстные поля должны быть пустыми');
      }
      return;
    }
    if (scopeType === PromoPageScopeType.CITY) {
      if (!cityId) throw new BadRequestException('Для CITY scope обязателен cityId');
      return;
    }
    if (scopeType === PromoPageScopeType.LANDING) {
      if (!landingId) throw new BadRequestException('Для LANDING scope обязателен landingId');
      return;
    }
    if (scopeType === PromoPageScopeType.COLLECTION) {
      if (!collectionId) throw new BadRequestException('Для COLLECTION scope обязателен collectionId');
      return;
    }
    if (scopeType === PromoPageScopeType.ARTICLE) {
      if (!articleId) throw new BadRequestException('Для ARTICLE scope обязателен articleId');
      return;
    }
  }

  private validateTarget(targetType: PromoTargetType, data: Record<string, unknown>) {
    const targetEventId = (data.targetEventId ?? null) as string | null;
    const targetCollectionId = (data.targetCollectionId ?? null) as string | null;
    const targetLandingId = (data.targetLandingId ?? null) as string | null;
    const targetArticleId = (data.targetArticleId ?? null) as string | null;

    const othersNonNull =
      (targetType !== PromoTargetType.EVENT && !!targetEventId) ||
      (targetType !== PromoTargetType.COLLECTION && !!targetCollectionId) ||
      (targetType !== PromoTargetType.LANDING && !!targetLandingId) ||
      (targetType !== PromoTargetType.ARTICLE && !!targetArticleId);
    if (othersNonNull) {
      throw new BadRequestException('Target поля должны соответствовать targetType (лишние target*Id должны быть пустыми)');
    }

    if (targetType === PromoTargetType.EVENT && !targetEventId) {
      throw new BadRequestException('Для EVENT target обязателен targetEventId');
    }
    if (targetType === PromoTargetType.COLLECTION && !targetCollectionId) {
      throw new BadRequestException('Для COLLECTION target обязателен targetCollectionId');
    }
    if (targetType === PromoTargetType.LANDING && !targetLandingId) {
      throw new BadRequestException('Для LANDING target обязателен targetLandingId');
    }
    if (targetType === PromoTargetType.ARTICLE && !targetArticleId) {
      throw new BadRequestException('Для ARTICLE target обязателен targetArticleId');
    }
  }

  private normalizeDates(startsAtIso: string | null, endsAtIso: string | null) {
    const startsAt = startsAtIso ? new Date(startsAtIso) : null;
    const endsAt = endsAtIso ? new Date(endsAtIso) : null;
    if (startsAt && Number.isNaN(startsAt.getTime())) throw new BadRequestException('startsAt некорректен');
    if (endsAt && Number.isNaN(endsAt.getTime())) throw new BadRequestException('endsAt некорректен');
    if (startsAt && endsAt && startsAt > endsAt) throw new BadRequestException('startsAt должен быть <= endsAt');
    return { startsAt, endsAt };
  }

  private async validateTargetExistsAndPublishable(targetType: PromoTargetType, data: Record<string, unknown>) {
    if (targetType === PromoTargetType.EVENT) {
      const id = (data.targetEventId ?? null) as string | null;
      if (!id) return;
      const ev = await this.prisma.event.findUnique({ where: { id }, select: { id: true, isActive: true, isDeleted: true, slug: true } });
      if (!ev) throw new BadRequestException('targetEventId: event не найден');
      if (!ev.isActive || ev.isDeleted) throw new BadRequestException('targetEventId: event не пригоден для публичной ссылки');
      return;
    }
    if (targetType === PromoTargetType.COLLECTION) {
      const id = (data.targetCollectionId ?? null) as string | null;
      if (!id) return;
      const col = await this.prisma.collection.findUnique({ where: { id }, select: { id: true, status: true, isActive: true, isDeleted: true, slug: true } });
      if (!col) throw new BadRequestException('targetCollectionId: collection не найдена');
      if (!col.isActive || col.isDeleted || col.status !== 'PUBLISHED') {
        throw new BadRequestException('targetCollectionId: collection не опубликована/неактивна');
      }
      return;
    }
    if (targetType === PromoTargetType.LANDING) {
      const id = (data.targetLandingId ?? null) as string | null;
      if (!id) return;
      const landing = await this.prisma.landingPage.findUnique({
        where: { id },
        select: { id: true, status: true, isActive: true, isDeleted: true, slug: true, city: { select: { slug: true } } },
      });
      if (!landing) throw new BadRequestException('targetLandingId: landing не найден');
      if (!landing.isActive || landing.isDeleted || landing.status !== 'PUBLISHED') {
        throw new BadRequestException('targetLandingId: landing не опубликован/неактивен');
      }
      if (!landing.city?.slug) {
        throw new BadRequestException('targetLandingId: landing без города пока не поддержан для публичной ссылки');
      }
      return;
    }
    if (targetType === PromoTargetType.ARTICLE) {
      const id = (data.targetArticleId ?? null) as string | null;
      if (!id) return;
      const article = await this.prisma.article.findUnique({
        where: { id },
        select: { id: true, status: true, slug: true, publishedAt: true },
      });
      if (!article) throw new BadRequestException('targetArticleId: article не найдена');
      if (article.status !== 'PUBLISHED' || !article.publishedAt) {
        throw new BadRequestException('targetArticleId: article не опубликована');
      }
    }
  }

  private toListItem(r: Prisma.PromoPlacementBlockGetPayload<{
    include: {
      city: { select: { id: true; name: true; slug: true } };
      landing: { select: { id: true; title: true; slug: true; city: { select: { slug: true; name: true } } } };
      collection: { select: { id: true; title: true; slug: true } };
      article: { select: { id: true; title: true; slug: true } };
      targetEvent: { select: { id: true; title: true; slug: true } };
      targetCollection: { select: { id: true; title: true; slug: true } };
      targetLanding: { select: { id: true; title: true; slug: true } };
      targetArticle: { select: { id: true; title: true; slug: true } };
    };
  }>) {
    const target =
      r.targetType === PromoTargetType.EVENT
        ? r.targetEvent
        : r.targetType === PromoTargetType.COLLECTION
          ? r.targetCollection
          : r.targetType === PromoTargetType.LANDING
            ? r.targetLanding
            : r.targetArticle;
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      placementZone: r.placementZone,
      pageScopeType: r.pageScopeType,
      city: r.city,
      landing: r.landing ? { id: r.landing.id, title: r.landing.title, slug: r.landing.slug } : null,
      collection: r.collection ? { id: r.collection.id, title: r.collection.title, slug: r.collection.slug } : null,
      article: r.article ? { id: r.article.id, title: r.article.title, slug: r.article.slug } : null,
      targetType: r.targetType,
      targetSummary: target ? { id: target.id, title: (target as { title: string }).title, slug: (target as { slug: string }).slug } : null,
      priority: r.priority,
      sortOrder: r.sortOrder,
      startsAt: r.startsAt ? r.startsAt.toISOString() : null,
      endsAt: r.endsAt ? r.endsAt.toISOString() : null,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private toDetail(
    r: Prisma.PromoPlacementBlockGetPayload<{
      include: {
        city: { select: { id: true; name: true; slug: true } };
        landing: { select: { id: true; title: true; slug: true; city: { select: { id: true; slug: true; name: true } } } };
        collection: { select: { id: true; title: true; slug: true } };
        article: { select: { id: true; title: true; slug: true } };
        targetEvent: { select: { id: true; title: true; slug: true } };
        targetCollection: { select: { id: true; title: true; slug: true } };
        targetLanding: { select: { id: true; title: true; slug: true; city: { select: { slug: true; name: true } } } };
        targetArticle: { select: { id: true; title: true; slug: true } };
      };
    }>,
  ) {
    const now = new Date();
    const active = isActiveNow(r.status, r.startsAt ?? null, r.endsAt ?? null, now);
    const { resolvedUrl, displayTitle, displaySubtitle, displayImageUrl } = this.buildPreview(r);

    const target =
      r.targetType === PromoTargetType.EVENT
        ? r.targetEvent
        : r.targetType === PromoTargetType.COLLECTION
          ? r.targetCollection
          : r.targetType === PromoTargetType.LANDING
            ? r.targetLanding
            : r.targetArticle;

    return {
      id: r.id,
      title: r.title,
      status: r.status,
      placementZone: r.placementZone,
      pageScopeType: r.pageScopeType,
      city: r.city,
      landing: r.landing ? { id: r.landing.id, title: r.landing.title, slug: r.landing.slug } : null,
      collection: r.collection ? { id: r.collection.id, title: r.collection.title, slug: r.collection.slug } : null,
      article: r.article ? { id: r.article.id, title: r.article.title, slug: r.article.slug } : null,
      targetType: r.targetType,
      target: target
        ? { id: target.id, title: (target as { title: string }).title, slug: (target as { slug: string }).slug, kind: r.targetType }
        : null,
      customTitle: r.customTitle,
      customSubtitle: r.customSubtitle,
      customImageUrl: r.customImageUrl,
      ctaLabel: r.ctaLabel,
      priority: r.priority,
      sortOrder: r.sortOrder,
      startsAt: r.startsAt ? r.startsAt.toISOString() : null,
      endsAt: r.endsAt ? r.endsAt.toISOString() : null,
      isCurrentlyActive: active,
      preview: { resolvedUrl, displayTitle, displaySubtitle, displayImageUrl },
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private buildPreview(
    r: Prisma.PromoPlacementBlockGetPayload<{
      include: {
        targetEvent: { select: { id: true; title: true; slug: true } };
        targetCollection: { select: { id: true; title: true; slug: true } };
        targetLanding: { select: { id: true; title: true; slug: true; city: { select: { slug: true } } } };
        targetArticle: { select: { id: true; title: true; slug: true } };
      };
    }>,
  ) {
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

    return { resolvedUrl, displayTitle, displaySubtitle, displayImageUrl };
  }
}

