import { describe, expect, it } from 'vitest';

import {
  buildCityHubReadinessSnapshot,
  buildLandingHubReadinessSnapshot,
  buildVenueHubReadinessSnapshot,
} from '../hub-readiness-snapshot.util';

describe('buildCityHubReadinessSnapshot', () => {
  const base = {
    cityId: 'c1',
    slug: 'spb',
    name: 'Санкт-Петербург',
    isActive: true,
    description: 'Описание',
    heroImage: 'https://x',
    metaTitle: 'T',
    metaDescription: 'D',
    storefrontActiveEvents: 5,
    collectionsCount: 1,
    landingsCount: 1,
    publishedArticlesCount: 1,
    publishedPromoBlocksCount: 1,
    siteBaseUrl: null,
  };

  it('returns NOT_A_HUB when intent off', () => {
    const s = buildCityHubReadinessSnapshot({
      ...base,
      isCatalogHub: false,
      catalogHubStatus: 'DISABLED',
    });
    expect(s.status).toBe('NOT_A_HUB');
    expect(s.score).toBeNull();
  });

  it('returns DRAFT when catalog hub status DRAFT', () => {
    const s = buildCityHubReadinessSnapshot({
      ...base,
      isCatalogHub: true,
      catalogHubStatus: 'DRAFT',
    });
    expect(s.status).toBe('DRAFT');
  });

  it('READY when ACTIVE and checks pass', () => {
    const s = buildCityHubReadinessSnapshot({
      ...base,
      isCatalogHub: true,
      catalogHubStatus: 'ACTIVE',
    });
    expect(s.status).toBe('READY');
    expect(s.score).toBeGreaterThan(70);
  });
});

describe('buildVenueHubReadinessSnapshot', () => {
  it('NOT_A_HUB for NONE', () => {
    const s = buildVenueHubReadinessSnapshot({
      venueId: 'v1',
      slug: 'erm',
      title: 'Музей',
      cityId: 'c1',
      citySlug: 'spb',
      venuePageMode: 'NONE',
      isActive: true,
      isPublished: true,
      lifecycleStatus: 'ACTIVE',
      mergeTargetId: null,
      address: 'ул',
      displayAddress: 'ул',
      metaTitle: 't',
      metaDescription: 'd',
      description: 'x',
      imageUrl: 'u',
      storefrontActiveEvents: 3,
      siteBaseUrl: null,
    });
    expect(s.status).toBe('NOT_A_HUB');
  });
});

describe('buildLandingHubReadinessSnapshot', () => {
  it('NOT_A_HUB when archived', () => {
    const s = buildLandingHubReadinessSnapshot({
      landingId: 'l1',
      slug: 'x',
      title: 'T',
      landingType: 'CITY',
      status: 'ARCHIVED',
      isDeleted: false,
      isActive: false,
      isIndexable: false,
      cityId: 'c1',
      parentLandingId: null,
      metaTitle: 'm',
      metaDescription: 'd',
      heroText: 'h',
      subtitle: 's',
      collectionId: null,
      relatedArticleIds: [],
      relatedCollectionIds: [],
      resolvedEventsTotal: 0,
      childLandingsCount: 0,
      citySlug: 'spb',
      canonicalUrl: null,
      siteBaseUrl: null,
    });
    expect(s.status).toBe('NOT_A_HUB');
  });
});
