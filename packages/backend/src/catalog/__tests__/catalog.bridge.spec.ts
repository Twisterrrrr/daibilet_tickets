import { describe, expect, it } from 'vitest';

type BridgeCollection = {
  id: string;
  slug: string;
  title: string;
  city: { slug: string; name: string };
};

type BridgeLanding = {
  id: string;
  slug: string;
  title: string;
  templateType: 'GENERIC_CARDS' | 'COMPARISON_TABLE' | 'HYBRID' | 'SEASONAL_EVENT';
};

function mapLegacyCollectionPayload(row: BridgeCollection) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    citySlug: row.city.slug,
    cityName: row.city.name,
  };
}

function mapFeaturedLandingPayload(row: BridgeLanding) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    templateType: row.templateType,
  };
}

describe('Catalog bridge contract', () => {
  it('matches snapshot for /catalog/collections/* bridge shape', () => {
    const payload = mapLegacyCollectionPayload({
      id: 'c1',
      slug: 'walking-spb',
      title: 'Пешие экскурсии СПб',
      city: { slug: 'spb', name: 'Санкт-Петербург' },
    });
    expect(payload).toMatchSnapshot();
  });

  it('matches snapshot for /catalog/collections/featured-landings', () => {
    const payload = mapFeaturedLandingPayload({
      id: 'l1',
      slug: 'bridge-opening',
      title: 'Развод мостов',
      templateType: 'COMPARISON_TABLE',
    });
    expect(payload).toMatchSnapshot();
  });
});
