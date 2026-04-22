import { FixtureScenario, type SeedContext } from './_types';
import { register, ensureArrayUnique } from './_helpers';

export async function seedCollections(ctx: SeedContext): Promise<void> {
  ctx.log.step('08 collections');

  const spb = ctx.registry.getRequired('city_spb').id;
  const moscow = ctx.registry.getRequired('city_moscow').id;

  const tagWeekend = ctx.registry.getRequired('tag_weekend').id;
  const tagFamily = ctx.registry.getRequired('tag_family').id;
  const tagHistory = ctx.registry.getRequired('tag_history').id;
  const tagCityExc = ctx.registry.getRequired('tag_city_excursions').id;

  const cols: Array<{
    stableKey: string;
    slug: string;
    cityId: string | null;
    title: string;
    scenario: FixtureScenario;
    comment: string;
    // legacy filterTags slugs
    filterTags: string[];
    // normalized tagFilters tagIds
    tagFilterIds: string[];
    status: 'DRAFT' | 'ACTIVE' | 'REJECTED' | 'ARCHIVED' | 'SUGGESTED';
    isActive: boolean;
    isDeleted?: boolean;
  }> = [
    {
      stableKey: 'collection_spb_weekend_normalized',
      slug: 'spb-weekend-fixtures',
      cityId: spb,
      title: 'Петербург на выходные (fixtures)',
      scenario: FixtureScenario.NORMALIZED_ONLY,
      comment: 'Normalized-only: CollectionTagFilter заполнены, legacy filterTags пуст.',
      filterTags: [],
      tagFilterIds: [tagWeekend, tagFamily],
      status: 'ACTIVE',
      isActive: true,
    },
    {
      stableKey: 'collection_spb_night_legacy',
      slug: 'spb-night-legacy-fixtures',
      cityId: spb,
      title: 'Ночные прогулки (legacy collection fixtures)',
      scenario: FixtureScenario.LEGACY_ONLY,
      comment: 'Legacy-only: filterTags=["night-cruises","jazz"], normalized tagFilters отсутствуют.',
      filterTags: ['night-cruises', 'jazz'],
      tagFilterIds: [],
      status: 'ACTIVE',
      isActive: true,
    },
    {
      stableKey: 'collection_spb_mixed',
      slug: 'spb-mixed-fixtures',
      cityId: spb,
      title: 'История + прогулки (mixed fixtures)',
      scenario: FixtureScenario.MIXED,
      comment: 'Mixed: legacy filterTags=["history"], normalized tagFilters=[history, city_excursions].',
      filterTags: ['history'],
      tagFilterIds: [tagHistory, tagCityExc],
      status: 'ACTIVE',
      isActive: true,
    },
    {
      stableKey: 'collection_spb_broken_missing_slug',
      slug: 'spb-broken-missing-slug-fixtures',
      cityId: spb,
      title: 'Broken missing legacy slug (fixtures)',
      scenario: FixtureScenario.BROKEN,
      comment: 'BROKEN: legacy filterTags содержит несуществующий slug.',
      filterTags: ensureArrayUnique(['missing-legacy-tag', 'weekend']),
      tagFilterIds: [],
      status: 'DRAFT',
      isActive: true,
    },
    {
      stableKey: 'collection_moscow_museums',
      slug: 'moscow-museums-fixtures',
      cityId: moscow,
      title: 'Музеи Москвы (fixtures)',
      scenario: FixtureScenario.HAPPY,
      comment: 'HAPPY: московская подборка (нормализованные фильтры).',
      filterTags: ['museums'],
      tagFilterIds: [],
      status: 'ACTIVE',
      isActive: true,
    },
    {
      stableKey: 'collection_deleted_target',
      slug: 'deleted-target-fixtures',
      cityId: spb,
      title: 'Deleted target (fixtures)',
      scenario: FixtureScenario.INACTIVE,
      comment: 'INACTIVE/BROKEN: скрытая/удалённая подборка для edge-case ссылок статей.',
      filterTags: ['history'],
      tagFilterIds: [],
      status: 'ARCHIVED',
      isActive: false,
      isDeleted: true,
    },
  ];

  for (const c of cols) {
    const row = await ctx.prisma.collection.upsert({
      where: { slug: c.slug },
      update: {
        cityId: c.cityId ?? undefined,
        title: c.title,
        filterTags: c.filterTags,
        status: c.status,
        isActive: c.isActive,
        isDeleted: c.isDeleted ?? false,
        deletedAt: c.isDeleted ? new Date() : null,
        metaTitle: `${c.title} — fixtures`,
        metaDescription: c.comment,
      },
      create: {
        slug: c.slug,
        cityId: c.cityId ?? undefined,
        title: c.title,
        filterTags: c.filterTags,
        pinnedEventIds: [],
        excludedEventIds: [],
        status: c.status,
        sourceType: 'MANUAL',
        selectionBasis: 'MANUAL',
        isActive: c.isActive,
        isDeleted: c.isDeleted ?? false,
        deletedAt: c.isDeleted ? new Date() : null,
        metaTitle: `${c.title} — fixtures`,
        metaDescription: c.comment,
      },
    });

    register(ctx, 'Collection', row.id, {
      stableKey: c.stableKey,
      scenario: c.scenario,
      comment: c.comment,
    });

    // Normalized tag filters (FK layer)
    for (let i = 0; i < c.tagFilterIds.length; i++) {
      const tagId = c.tagFilterIds[i]!;
      await ctx.prisma.collectionTagFilter.upsert({
        where: { collectionId_tagId: { collectionId: row.id, tagId } },
        update: { position: i, priority: 0 },
        create: { collectionId: row.id, tagId, position: i, priority: 0 },
      });
    }
  }
}

