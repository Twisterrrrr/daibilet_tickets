import { TagCategory } from '../../src/prisma-client';
import { FixtureScenario, type SeedContext } from './_types';
import { register } from './_helpers';

export async function seedTags(ctx: SeedContext): Promise<void> {
  ctx.log.step('03 tags');

  const tags: Array<{
    stableKey: string;
    slug: string;
    name: string;
    category: TagCategory;
    scenario: FixtureScenario;
    isActive: boolean;
    comment: string;
  }> = [
    { stableKey: 'tag_river_cruises', slug: 'river-cruises', name: 'Речные прогулки', category: TagCategory.THEME, scenario: FixtureScenario.HAPPY, isActive: true, comment: 'Ключевой тег для речных событий.' },
    { stableKey: 'tag_night_cruises', slug: 'night-cruises', name: 'Ночные прогулки', category: TagCategory.THEME, scenario: FixtureScenario.HAPPY, isActive: true, comment: 'Для ночных лендингов/подборок.' },
    { stableKey: 'tag_museums', slug: 'museums', name: 'Музеи', category: TagCategory.THEME, scenario: FixtureScenario.HAPPY, isActive: true, comment: 'Для московского сценария.' },
    { stableKey: 'tag_jazz', slug: 'jazz', name: 'Джаз', category: TagCategory.THEME, scenario: FixtureScenario.HAPPY, isActive: true, comment: 'Тематика/фильтры; структурный тип события — подкатегория JAZZ.' },
    { stableKey: 'tag_evening', slug: 'evening', name: 'Вечером', category: TagCategory.SEASON, scenario: FixtureScenario.HAPPY, isActive: true, comment: 'Время суток / «вечерние» события; в справочнике Subcategory кода EVENING нет — используем тег.' },
    { stableKey: 'tag_kids', slug: 'kids', name: 'Детям', category: TagCategory.AUDIENCE, scenario: FixtureScenario.HAPPY, isActive: true, comment: 'Для kids/family.' },
    { stableKey: 'tag_history', slug: 'history', name: 'История', category: TagCategory.THEME, scenario: FixtureScenario.HAPPY, isActive: true, comment: 'Для mixed-кейсов нормализации.' },
    { stableKey: 'tag_weekend', slug: 'weekend', name: 'Выходные', category: TagCategory.SEASON, scenario: FixtureScenario.HAPPY, isActive: true, comment: 'Для подборки выходных.' },
    { stableKey: 'tag_family', slug: 'family', name: 'Семейный', category: TagCategory.AUDIENCE, scenario: FixtureScenario.HAPPY, isActive: true, comment: 'Для family подборок.' },
    { stableKey: 'tag_outdoor', slug: 'outdoor', name: 'На улице', category: TagCategory.SPECIAL, scenario: FixtureScenario.HAPPY, isActive: true, comment: 'Для разнообразия фильтров.' },
    { stableKey: 'tag_city_excursions', slug: 'city-excursions', name: 'Городские экскурсии', category: TagCategory.THEME, scenario: FixtureScenario.HAPPY, isActive: true, comment: 'Для city excursions.' },
    { stableKey: 'tag_inactive_legacy', slug: 'inactive-legacy', name: 'Inactive legacy', category: TagCategory.SPECIAL, scenario: FixtureScenario.INACTIVE, isActive: false, comment: 'Неактивный тег для edge-case.' },
  ];

  for (const t of tags) {
    const tag = await ctx.prisma.tag.upsert({
      where: { slug: t.slug },
      update: {
        name: t.name,
        category: t.category,
        isActive: t.isActive,
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        slug: t.slug,
        name: t.name,
        category: t.category,
        isActive: t.isActive,
        isDeleted: false,
        metaTitle: `${t.name} — fixtures`,
        metaDescription: `Fixture tag: ${t.slug}`,
      },
    });

    register(ctx, 'Tag', tag.id, {
      stableKey: t.stableKey,
      scenario: t.scenario,
      comment: t.comment,
    });
  }

  ctx.log.info('NOTE: tag_missing_legacy_slug is intentionally NOT created; used only as broken legacy slug.');
}

