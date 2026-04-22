import { describe, expect, it, vi } from 'vitest';
import { PromoBlockStatus, PromoPageScopeType, PromoPlacementZone, PromoTargetType } from '@/prisma-client';
import { PromoPlacementBlocksPublicService } from '../promo-placement-blocks.service';

describe('PromoPlacementBlocksPublicService', () => {
  it('filters by status/window/scope and orders by priority/sortOrder', async () => {
    const findMany = vi.fn().mockResolvedValue([
      // Assume prisma returns already ordered by orderBy (priority desc, sortOrder asc, updatedAt desc)
      {
        id: 'b1',
        title: 'B1',
        placementZone: PromoPlacementZone.HOME_HERO,
        pageScopeType: PromoPageScopeType.GLOBAL,
        status: PromoBlockStatus.PUBLISHED,
        startsAt: null,
        endsAt: null,
        priority: 10,
        sortOrder: 0,
        targetType: PromoTargetType.EVENT,
        targetEvent: { id: 'e1', title: 'E1', slug: 'e1' },
        targetCollection: null,
        targetLanding: null,
        targetArticle: null,
        customTitle: 'Override',
        customSubtitle: null,
        customImageUrl: null,
        ctaLabel: null,
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: 'b2',
        title: 'B2',
        placementZone: PromoPlacementZone.HOME_HERO,
        pageScopeType: PromoPageScopeType.GLOBAL,
        status: PromoBlockStatus.PUBLISHED,
        startsAt: null,
        endsAt: null,
        priority: 5,
        sortOrder: 10,
        targetType: PromoTargetType.EVENT,
        targetEvent: { id: 'e2', title: 'E2', slug: 'e2' },
        targetCollection: null,
        targetLanding: null,
        targetArticle: null,
        customTitle: null,
        customSubtitle: null,
        customImageUrl: null,
        ctaLabel: null,
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);
    const prisma = {
      promoPlacementBlock: { findMany },
    } as any;
    const svc = new PromoPlacementBlocksPublicService(prisma);

    const res = await svc.resolve({
      placementZone: PromoPlacementZone.HOME_HERO,
      pageScopeType: PromoPageScopeType.GLOBAL,
      now: new Date('2026-01-02T00:00:00Z'),
      limit: 10,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          placementZone: PromoPlacementZone.HOME_HERO,
          pageScopeType: PromoPageScopeType.GLOBAL,
          status: PromoBlockStatus.PUBLISHED,
        }),
        orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
        take: 10,
      }),
    );

    expect(res.map((x) => x.id)).toEqual(['b1', 'b2']);
    expect(res[0]!.preview.displayTitle).toBe('Override');
    expect(res[1]!.preview.resolvedUrl).toBe('/events/e2');
  });
});

