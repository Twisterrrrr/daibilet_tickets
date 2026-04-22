import { FixtureScenario, type SeedContext } from './_types';
import { register } from './_helpers';

export async function seedLandings(ctx: SeedContext): Promise<void> {
  ctx.log.step('07 landings');

  const spb = ctx.registry.getRequired('city_spb').id;
  const moscow = ctx.registry.getRequired('city_moscow').id;
  const kazan = ctx.registry.getRequired('city_kazan').id;

  const tagNight = ctx.registry.getRequired('tag_night_cruises').id;
  const tagHistory = ctx.registry.getRequired('tag_history').id;
  const tagMuseums = ctx.registry.getRequired('tag_museums').id;

  const landings: Array<{
    stableKey: string;
    cityId: string;
    slug: string;
    title: string;
    scenario: FixtureScenario;
    comment: string;
    filterTag: string;
    filterTagId: string | null;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    isIndexable: boolean;
  }> = [
    {
      stableKey: 'landing_spb_night_cruises_normalized',
      cityId: spb,
      slug: 'night-cruises',
      title: 'Ночные прогулки по Петербургу (fixtures)',
      scenario: FixtureScenario.NORMALIZED_ONLY,
      comment: 'Normalized-only: filterTagId заполнен, legacy filterTag синхронен.',
      filterTag: 'night-cruises',
      filterTagId: tagNight,
      status: 'ACTIVE',
      isIndexable: true,
    },
    {
      stableKey: 'landing_spb_jazz_legacy',
      cityId: spb,
      slug: 'jazz',
      title: 'Джаз (legacy landing fixtures)',
      scenario: FixtureScenario.LEGACY_ONLY,
      comment: 'Legacy-only: filterTag slug без filterTagId.',
      filterTag: 'jazz',
      filterTagId: null,
      status: 'ACTIVE',
      isIndexable: true,
    },
    {
      stableKey: 'landing_spb_history_mixed',
      cityId: spb,
      slug: 'history',
      title: 'История Петербурга (mixed fixtures)',
      scenario: FixtureScenario.MIXED,
      comment: 'Mixed: filterTagId + legacy filterTag = history.',
      filterTag: 'history',
      filterTagId: tagHistory,
      status: 'ACTIVE',
      isIndexable: true,
    },
    {
      stableKey: 'landing_spb_missing_legacy_tag',
      cityId: spb,
      slug: 'missing-legacy-tag',
      title: 'Broken legacy tag (fixtures)',
      scenario: FixtureScenario.BROKEN,
      comment: 'BROKEN: legacy filterTag slug не существует в Tag.',
      filterTag: 'missing-legacy-tag',
      filterTagId: null,
      status: 'DRAFT',
      isIndexable: false,
    },
    {
      stableKey: 'landing_moscow_museums',
      cityId: moscow,
      slug: 'museums',
      title: 'Музеи Москвы (fixtures)',
      scenario: FixtureScenario.HAPPY,
      comment: 'HAPPY: нормальный московский кейс.',
      filterTag: 'museums',
      filterTagId: tagMuseums,
      status: 'ACTIVE',
      isIndexable: true,
    },
    {
      stableKey: 'landing_kazan_thin',
      cityId: kazan,
      slug: 'kazan-thin',
      title: 'Казань — thin landing (fixtures)',
      scenario: FixtureScenario.THIN,
      comment: 'THIN: почти пустой лендинг, пригоден для SEO audit.',
      filterTag: 'weekend',
      filterTagId: null,
      status: 'DRAFT',
      isIndexable: false,
    },
  ];

  for (const l of landings) {
    const row = await ctx.prisma.landingPage.upsert({
      where: { cityId_slug: { cityId: l.cityId, slug: l.slug } },
      update: {
        title: l.title,
        filterTag: l.filterTag,
        filterTagId: l.filterTagId ?? undefined,
        status: l.status,
        isIndexable: l.isIndexable,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
        metaTitle: `${l.title} — fixtures`,
        metaDescription: l.comment,
      },
      create: {
        cityId: l.cityId,
        slug: l.slug,
        title: l.title,
        filterTag: l.filterTag,
        filterTagId: l.filterTagId ?? undefined,
        status: l.status,
        isIndexable: l.isIndexable,
        isActive: true,
        isDeleted: false,
        landingType: 'CITY',
        selectionMode: 'CUSTOM',
        eventSourceType: 'PRIMARY_COLLECTION',
        templateType: 'GENERIC_CARDS',
        metaTitle: `${l.title} — fixtures`,
        metaDescription: l.comment,
      },
    });

    register(ctx, 'LandingPage', row.id, {
      stableKey: l.stableKey,
      scenario: l.scenario,
      comment: l.comment,
    });
  }
}

