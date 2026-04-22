import { describe, expect, it, vi } from 'vitest';

import { LandingSeoAuditService } from '../landing-seo-audit.service';

describe('LandingSeoAuditService', () => {
  it('returns baseline issues when landing not found', async () => {
    const prisma = {
      landingPage: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const svc = new LandingSeoAuditService(prisma);
    const r = await svc.auditLandingPage('00000000-0000-0000-0000-000000000000');
    expect(r.issues).toContain('NO_H1');
    expect(r.score).toBe(0);
  });

  it('flags NO_MATCHED_EVENTS when count is zero', async () => {
    const prisma = {
      landingPage: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue({
          id: 'a',
          slug: 'x',
          title: 'T',
          subtitle: null,
          heroText: 'h',
          heroTitle: null,
          heroImageUrl: null,
          metaTitle: 'm',
          metaDescription: 'd',
          seoH1: null,
          seoTitle: null,
          seoDescription: null,
          ogImageUrl: null,
          isIndexable: true,
          canonicalUrl: 'https://example.com/x',
          canonicalMode: 'SELF',
          canonicalLandingId: null,
          landingType: 'CITY',
          cityId: 'c',
          infoBlocks: [],
          faq: [],
          legalText: null,
          city: { slug: 'spb', name: 'SPb' },
          contentBlocks: [{ id: '1', type: 'FAQ' }],
          canonicalLanding: null,
        }),
      },
    } as any;

    const svc = new LandingSeoAuditService(prisma);
    const r = await svc.auditLandingPage('a', 0);
    expect(r.issues).toContain('NO_MATCHED_EVENTS');
  });
});
