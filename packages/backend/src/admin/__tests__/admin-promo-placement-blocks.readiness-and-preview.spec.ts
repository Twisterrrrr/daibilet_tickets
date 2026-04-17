import { describe, expect, it, vi } from 'vitest';
import { PromoBlockStatus, PromoPageScopeType, PromoPlacementZone, PromoTargetType } from '@/prisma-client';
import { AdminPromoPlacementBlocksService } from '../admin-promo-placement-blocks.service';

describe('AdminPromoPlacementBlocksService (readiness + resolvedPreview)', () => {
  it('list() returns readinessStatus/reasons (scheduled)', async () => {
    const prisma = {
      promoPlacementBlock: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'b1',
            title: 'T',
            status: PromoBlockStatus.PUBLISHED,
            placementZone: PromoPlacementZone.HOME_HERO,
            pageScopeType: PromoPageScopeType.GLOBAL,
            cityId: null,
            landingId: null,
            collectionId: null,
            articleId: null,
            targetType: PromoTargetType.EVENT,
            targetEventId: 'e1',
            targetCollectionId: null,
            targetLandingId: null,
            targetArticleId: null,
            targetEvent: { id: 'e1', title: 'E1', slug: 'e1', isActive: true, isDeleted: false },
            targetCollection: null,
            targetLanding: null,
            targetArticle: null,
            customTitle: null,
            customSubtitle: null,
            customImageUrl: null,
            ctaLabel: null,
            priority: 0,
            sortOrder: 0,
            startsAt: new Date('2999-01-01T00:00:00Z'),
            endsAt: null,
            publishedAt: null,
            updatedAt: new Date('2026-01-01T00:00:00Z'),
            createdAt: new Date('2026-01-01T00:00:00Z'),
            city: null,
            landing: null,
            collection: null,
            article: null,
          },
        ]),
        findUnique: vi.fn(),
      },
      event: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as any;
    const svc = new AdminPromoPlacementBlocksService(prisma);
    const res = await svc.list({ page: 1, limit: 50 });
    expect(res.items[0]).toEqual(
      expect.objectContaining({
        readinessStatus: 'SCHEDULED',
        readinessReasons: expect.arrayContaining(['WINDOW_NOT_STARTED']),
      }),
    );
  });

  it('resolvedPreview(): scope mismatch yields NO_SCOPE_MATCH and returns top for context', async () => {
    const prisma = {
      promoPlacementBlock: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'b1',
          title: 'T',
          status: PromoBlockStatus.PUBLISHED,
          placementZone: PromoPlacementZone.CITY_HERO,
          pageScopeType: PromoPageScopeType.CITY,
          cityId: 'city-1',
          landingId: null,
          collectionId: null,
          articleId: null,
          targetType: PromoTargetType.EVENT,
          targetEventId: 'e1',
          targetCollectionId: null,
          targetLandingId: null,
          targetArticleId: null,
          targetEvent: { id: 'e1', title: 'E1', slug: 'e1', isActive: true, isDeleted: false },
          targetCollection: null,
          targetLanding: null,
          targetArticle: null,
          customTitle: null,
          customSubtitle: null,
          customImageUrl: null,
          ctaLabel: null,
          priority: 0,
          sortOrder: 0,
          startsAt: null,
          endsAt: null,
          publishedAt: null,
          updatedAt: new Date('2026-01-01T00:00:00Z'),
          createdAt: new Date('2026-01-01T00:00:00Z'),
          city: null,
          landing: null,
          collection: null,
          article: null,
        }),
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'other',
            title: 'O',
            status: PromoBlockStatus.PUBLISHED,
            placementZone: PromoPlacementZone.CITY_HERO,
            pageScopeType: PromoPageScopeType.CITY,
            cityId: 'city-2',
            landingId: null,
            collectionId: null,
            articleId: null,
            targetType: PromoTargetType.EVENT,
            targetEventId: 'e2',
            targetCollectionId: null,
            targetLandingId: null,
            targetArticleId: null,
            targetEvent: { id: 'e2', title: 'E2', slug: 'e2', isActive: true, isDeleted: false },
            targetCollection: null,
            targetLanding: null,
            targetArticle: null,
            customTitle: null,
            customSubtitle: null,
            customImageUrl: null,
            ctaLabel: null,
            priority: 10,
            sortOrder: 0,
            startsAt: null,
            endsAt: null,
            publishedAt: null,
            updatedAt: new Date('2026-01-01T00:00:00Z'),
          },
        ]),
      },
      event: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as any;
    const svc = new AdminPromoPlacementBlocksService(prisma);
    const res = await svc.resolvedPreview('b1', {
      pageScopeType: PromoPageScopeType.CITY,
      cityId: 'city-2',
      limit: 10,
    } as any);

    expect(res.diagnostics.readinessReasons).toEqual(expect.arrayContaining(['NO_SCOPE_MATCH']));
    expect(res.resolvedTop).toHaveLength(1);
    expect(res.resolvedTop[0]!.id).toBe('other');
    expect(res.diagnostics.winnerId).toBe('other');
    expect(res.resolvedAll).toHaveLength(1);
    expect(res.diagnostics.comparisonToWinner).toEqual(
      expect.objectContaining({
        outcome: expect.any(String),
        reasons: expect.arrayContaining(['SCOPE_MISMATCH']),
      }),
    );
  });
});

