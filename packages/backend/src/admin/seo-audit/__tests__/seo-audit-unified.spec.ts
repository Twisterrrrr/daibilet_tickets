import { describe, expect, it, vi } from 'vitest';

import { SeoAuditService } from '../seo-audit.service';

describe('SeoAuditService.getUnifiedIssues (EVENT taxonomy issues)', () => {
  it('returns NO_SUBCATEGORY when no links and no legacy', async () => {
    const prisma: any = {
      event: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'e1',
            title: 'T',
            slug: 's',
            imageUrl: 'https://x',
            subcategories: [],
            isActive: true,
            updatedAt: new Date(),
            city: { name: 'СПб' },
            override: { imageUrl: null },
          },
        ]),
      },
      eventSession: { groupBy: vi.fn().mockResolvedValue([{ eventId: 'e1', _count: { id: 1 } }]) },
      eventOffer: { groupBy: vi.fn().mockResolvedValue([{ eventId: 'e1', _count: { id: 1 } }]) },
      eventSubcategoryLink: { groupBy: vi.fn().mockResolvedValue([]) },
      city: { findUnique: vi.fn() },
      venue: { findUnique: vi.fn() },
    };

    const svc = new SeoAuditService(prisma);
    const res = await svc.getUnifiedIssues({ entityType: 'EVENT', onlyIssues: 'true', page: '1', limit: '50' });
    expect(res.items.some((x) => x.issueCode === 'NO_SUBCATEGORY')).toBe(true);
  });

  it('returns TOO_MANY_SUBCATEGORIES when links exceed max', async () => {
    const prisma: any = {
      event: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'e1',
            title: 'T',
            slug: 's',
            imageUrl: 'https://x',
            subcategories: [],
            isActive: true,
            updatedAt: new Date(),
            city: { name: 'СПб' },
            override: { imageUrl: null },
          },
        ]),
      },
      eventSession: { groupBy: vi.fn().mockResolvedValue([{ eventId: 'e1', _count: { id: 1 } }]) },
      eventOffer: { groupBy: vi.fn().mockResolvedValue([{ eventId: 'e1', _count: { id: 1 } }]) },
      eventSubcategoryLink: { groupBy: vi.fn().mockResolvedValue([{ eventId: 'e1', _count: { _all: 99 } }]) },
      city: { findUnique: vi.fn() },
      venue: { findUnique: vi.fn() },
    };

    const svc = new SeoAuditService(prisma);
    const res = await svc.getUnifiedIssues({ entityType: 'EVENT', onlyIssues: 'true', page: '1', limit: '50' });
    expect(res.items.some((x) => x.issueCode === 'TOO_MANY_SUBCATEGORIES')).toBe(true);
  });
});

