import type { SeedContext } from './_types';
import { FixtureScenario } from './_types';
import { register } from './_helpers';

export async function seedPromoBlocks(ctx: SeedContext): Promise<void> {
  ctx.log.step('14 promo blocks');

  const blocks: Array<{
    stableKey: string;
    slug: string;
    title: string;
    description: string;
    scenario: FixtureScenario;
    isActive: boolean;
    citySlug?: string | null;
    comment: string;
  }> = [
    {
      stableKey: 'promo_active_hero',
      slug: 'fixture-promo-active-hero',
      title: 'Hero promo (fixtures)',
      description: 'Активный промо-блок для проверки списков.',
      scenario: FixtureScenario.HAPPY,
      isActive: true,
      citySlug: null,
      comment: 'Active hero promo.',
    },
    {
      stableKey: 'promo_city_specific',
      slug: 'fixture-promo-city-spb',
      title: 'СПб промо (fixtures)',
      description: 'Промо-блок для конкретного города.',
      scenario: FixtureScenario.HAPPY,
      isActive: true,
      citySlug: 'saint-petersburg',
      comment: 'City-specific promo for SPB.',
    },
    {
      stableKey: 'promo_inactive',
      slug: 'fixture-promo-inactive',
      title: 'Inactive promo (fixtures)',
      description: 'Неактивный промо-блок для edge-case.',
      scenario: FixtureScenario.INACTIVE,
      isActive: false,
      citySlug: null,
      comment: 'Inactive promo.',
    },
  ];

  for (const b of blocks) {
    const row = await ctx.prisma.promoBlock.upsert({
      where: { slug: b.slug },
      update: {
        title: b.title,
        description: b.description,
        citySlug: b.citySlug ?? undefined,
        isActive: b.isActive,
        tagSlugs: [],
        contentMode: 'LINK_ONLY',
        contentType: 'LINK_ONLY',
        selectionMode: 'MANUAL',
      },
      create: {
        slug: b.slug,
        title: b.title,
        description: b.description,
        citySlug: b.citySlug ?? undefined,
        isActive: b.isActive,
        tagSlugs: [],
        contentMode: 'LINK_ONLY',
        contentType: 'LINK_ONLY',
        selectionMode: 'MANUAL',
      },
    });

    register(ctx, 'PromoBlock', row.id, {
      stableKey: b.stableKey,
      scenario: b.scenario,
      comment: b.comment,
    });
  }
}

