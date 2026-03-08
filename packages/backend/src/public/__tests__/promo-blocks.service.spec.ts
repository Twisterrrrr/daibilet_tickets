import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PromoBlocksPublicService } from '../promo-blocks.service';

const mockPrisma = {
  promoBlock: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  promoCollection: {
    findUnique: vi.fn(),
  },
};

const mockResolver = {
  resolveEvents: vi.fn(),
  resolveVenues: vi.fn(),
};

describe('PromoBlocksPublicService', () => {
  let service: PromoBlocksPublicService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PromoBlocksPublicService(
      mockPrisma as any,
      mockResolver as any,
    );
  });

  describe('list (runtime validation)', () => {
    const baseBlock = {
      slug: 'test',
      title: 'Test',
      description: 'D',
      href: '/events',
      contentMode: 'LINK_ONLY',
      collectionId: null,
      collection: null,
      iconSource: 'LIBRARY',
      iconKey: null,
      iconSvg: null,
      bgMode: 'GRADIENT',
      bgColor: null,
      gradientFrom: null,
      gradientTo: null,
    };

    it('COLLECTION block with deleted collection → not shown', async () => {
      mockPrisma.promoBlock.findMany.mockResolvedValue([
        {
          ...baseBlock,
          contentMode: 'COLLECTION',
          collectionId: 'col-1',
          collection: null,
          href: null,
        },
      ]);
      const result = await service.list();
      expect(result).toHaveLength(0);
    });

    it('COLLECTION block with 0 items → not shown', async () => {
      mockPrisma.promoBlock.findMany.mockResolvedValue([
        {
          ...baseBlock,
          contentMode: 'COLLECTION',
          collectionId: 'col-1',
          collection: { slug: 'my-col', isActive: true },
          href: null,
        },
      ]);
      mockPrisma.promoCollection.findUnique.mockResolvedValue({
        id: 'col-1',
        contentType: 'EVENTS',
      });
      mockResolver.resolveEvents.mockResolvedValue([]);

      const result = await service.list();
      expect(result).toHaveLength(0);
    });

    it('COLLECTION block with items → shown', async () => {
      mockPrisma.promoBlock.findMany.mockResolvedValue([
        {
          ...baseBlock,
          contentMode: 'COLLECTION',
          collectionId: 'col-1',
          collection: { slug: 'my-col', isActive: true },
          href: null,
        },
      ]);
      mockPrisma.promoCollection.findUnique.mockResolvedValue({
        id: 'col-1',
        contentType: 'EVENTS',
      });
      mockResolver.resolveEvents.mockResolvedValue([{ id: 'e1', slug: 'ev', title: 'E' }]);

      const result = await service.list();
      expect(result).toHaveLength(1);
      expect(result[0].href).toBe('/promo/my-col');
    });

    it('LINK_ONLY block without href → not shown', async () => {
      mockPrisma.promoBlock.findMany.mockResolvedValue([
        { ...baseBlock, href: '', contentMode: 'LINK_ONLY' },
      ]);
      const result = await service.list();
      expect(result).toHaveLength(0);
    });

    it('citySlug filtering: returns global + city-targeted blocks', async () => {
      mockPrisma.promoBlock.findMany.mockResolvedValue([
        { ...baseBlock, slug: 'global' },
        { ...baseBlock, slug: 'spb' },
      ]);
      const result = await service.list('saint-petersburg');
      expect(mockPrisma.promoBlock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.any(Array),
          }),
        }),
      );
      expect(result).toHaveLength(2);
    });

    it('without citySlug: fetches only global blocks (targetCitySlugs empty)', async () => {
      mockPrisma.promoBlock.findMany.mockResolvedValue([{ ...baseBlock }]);
      await service.list();
      expect(mockPrisma.promoBlock.findMany).toHaveBeenCalled();
      const call = mockPrisma.promoBlock.findMany.mock.calls[0][0];
      expect(call.where).toBeDefined();
      expect(call.where.isActive).toBe(true);
    });
  });
});
