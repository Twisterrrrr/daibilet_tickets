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

describe('SeoAuditService.getUnifiedIssues (content entities)', () => {
  it('ARTICLE: returns PUBLISHED_WITHOUT_SEO when published without meta', async () => {
    const prisma: any = {
      // minimal stubs required by constructor paths
      event: { count: vi.fn(), findMany: vi.fn() },
      eventSession: { groupBy: vi.fn() },
      eventOffer: { groupBy: vi.fn() },
      eventSubcategoryLink: { groupBy: vi.fn() },
      city: { findUnique: vi.fn() },
      venue: { findUnique: vi.fn() },
      article: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'a1',
            title: 'A',
            slug: 'a',
            metaTitle: null,
            metaDescription: null,
            status: 'PUBLISHED',
            updatedAt: new Date(),
          },
        ]),
      },
    };

    const svc = new SeoAuditService(prisma);
    const res = await svc.getUnifiedIssues({ entityType: 'ARTICLE', onlyIssues: 'true', page: '1', limit: '50' });
    expect(res.items.some((x) => x.issueCode === 'PUBLISHED_WITHOUT_SEO')).toBe(true);
  });

  it('LANDING: returns FILTER_TAG_MISSING when filterTagId is null', async () => {
    const prisma: any = {
      event: { count: vi.fn(), findMany: vi.fn() },
      eventSession: { groupBy: vi.fn() },
      eventOffer: { groupBy: vi.fn() },
      eventSubcategoryLink: { groupBy: vi.fn() },
      city: { findUnique: vi.fn() },
      venue: { findUnique: vi.fn() },
      landingPage: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'l1',
            title: 'L',
            slug: 'l',
            status: 'DRAFT',
            metaTitle: 'x',
            metaDescription: 'y',
            filterTagId: null,
            updatedAt: new Date(),
            city: { name: 'СПб' },
          },
        ]),
      },
    };

    const svc = new SeoAuditService(prisma);
    const res = await svc.getUnifiedIssues({ entityType: 'LANDING', onlyIssues: 'true', page: '1', limit: '50' });
    expect(res.items.some((x) => x.issueCode === 'FILTER_TAG_MISSING')).toBe(true);
  });

  it('COLLECTION: returns TAG_FILTERS_MISSING when both tagFilters and legacy filterTags are empty', async () => {
    const prisma: any = {
      event: { count: vi.fn(), findMany: vi.fn() },
      eventSession: { groupBy: vi.fn() },
      eventOffer: { groupBy: vi.fn() },
      eventSubcategoryLink: { groupBy: vi.fn() },
      city: { findUnique: vi.fn() },
      venue: { findUnique: vi.fn() },
      collection: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'c1',
            title: 'C',
            slug: 'c',
            status: 'DRAFT',
            metaTitle: 'x',
            metaDescription: 'y',
            filterTags: [],
            updatedAt: new Date(),
            city: { name: 'СПб' },
            _count: { tagFilters: 0 },
          },
        ]),
      },
    };

    const svc = new SeoAuditService(prisma);
    const res = await svc.getUnifiedIssues({ entityType: 'COLLECTION', onlyIssues: 'true', page: '1', limit: '50' });
    expect(res.items.some((x) => x.issueCode === 'TAG_FILTERS_MISSING')).toBe(true);
  });
});

