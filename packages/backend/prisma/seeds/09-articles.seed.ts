import { randomUUID } from 'crypto';

import { FixtureScenario, type SeedContext } from './_types';
import { register } from './_helpers';

export async function seedArticles(ctx: SeedContext): Promise<void> {
  ctx.log.step('09 articles');

  const spb = ctx.registry.getRequired('city_spb').id;

  const landingNight = ctx.registry.getRequired('landing_spb_night_cruises_normalized').id;
  const landingHistory = ctx.registry.getRequired('landing_spb_history_mixed').id;
  const landingJazzLegacy = ctx.registry.getRequired('landing_spb_jazz_legacy').id;

  const colWeekendNorm = ctx.registry.getRequired('collection_spb_weekend_normalized').id;
  const colNightLegacy = ctx.registry.getRequired('collection_spb_night_legacy').id;
  const colMixed = ctx.registry.getRequired('collection_spb_mixed').id;
  const colDeleted = ctx.registry.getRequired('collection_deleted_target').id;

  const tagHistory = ctx.registry.getRequired('tag_history').id;
  const tagCityExc = ctx.registry.getRequired('tag_city_excursions').id;

  const brokenLandingId = randomUUID();

  const articles: Array<{
    stableKey: string;
    slug: string;
    title: string;
    scenario: FixtureScenario;
    comment: string;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    // legacy arrays
    relatedLandingIds: string[];
    relatedCollectionIds: string[];
    // normalized links
    landingLinks: Array<{ landingId: string; position: number }>;
    collectionLinks: Array<{ collectionId: string; position: number }>;
    tagIds: string[];
  }> = [
    {
      stableKey: 'article_normalized_links',
      slug: 'fixture-article-normalized-links',
      title: 'Ночные прогулки: как выбрать (fixtures)',
      scenario: FixtureScenario.NORMALIZED_ONLY,
      comment: 'Normalized-only: links только через ArticleLandingLink/ArticleCollectionLink.',
      status: 'PUBLISHED',
      relatedLandingIds: [],
      relatedCollectionIds: [],
      landingLinks: [{ landingId: landingNight, position: 0 }],
      collectionLinks: [{ collectionId: colWeekendNorm, position: 0 }],
      tagIds: [tagHistory, tagCityExc],
    },
    {
      stableKey: 'article_legacy_only',
      slug: 'fixture-article-legacy-only',
      title: 'Джаз на воде (legacy fixtures)',
      scenario: FixtureScenario.LEGACY_ONLY,
      comment: 'Legacy-only: relatedLandingIds/relatedCollectionIds, link-таблицы пустые.',
      status: 'PUBLISHED',
      relatedLandingIds: [landingJazzLegacy],
      relatedCollectionIds: [colNightLegacy],
      landingLinks: [],
      collectionLinks: [],
      tagIds: [tagCityExc],
    },
    {
      stableKey: 'article_mixed_links',
      slug: 'fixture-article-mixed-links',
      title: 'Исторические маршруты (mixed fixtures)',
      scenario: FixtureScenario.MIXED,
      comment: 'Mixed: есть и legacy arrays, и нормализованные links (специально немного отличаются).',
      status: 'PUBLISHED',
      relatedLandingIds: [landingHistory],
      relatedCollectionIds: [colMixed],
      landingLinks: [{ landingId: landingNight, position: 0 }],
      collectionLinks: [{ collectionId: colWeekendNorm, position: 0 }],
      tagIds: [tagHistory],
    },
    {
      stableKey: 'article_broken_missing_landing',
      slug: 'fixture-article-broken-missing-landing',
      title: 'Broken landing link (fixtures)',
      scenario: FixtureScenario.BROKEN,
      comment: 'BROKEN: legacy relatedLandingIds содержит UUID, которого нет.',
      status: 'DRAFT',
      relatedLandingIds: [brokenLandingId],
      relatedCollectionIds: [],
      landingLinks: [],
      collectionLinks: [],
      tagIds: [],
    },
    {
      stableKey: 'article_deleted_collection_target',
      slug: 'fixture-article-deleted-collection-target',
      title: 'Ссылка на скрытую подборку (fixtures)',
      scenario: FixtureScenario.BROKEN,
      comment: 'BROKEN: legacy relatedCollectionIds указывает на isDeleted/isActive=false collection.',
      status: 'DRAFT',
      relatedLandingIds: [],
      relatedCollectionIds: [colDeleted],
      landingLinks: [],
      collectionLinks: [],
      tagIds: [],
    },
    {
      stableKey: 'article_without_relations',
      slug: 'fixture-article-without-relations',
      title: 'Просто статья без связей (fixtures)',
      scenario: FixtureScenario.HAPPY,
      comment: 'HAPPY: статья без related links.',
      status: 'PUBLISHED',
      relatedLandingIds: [],
      relatedCollectionIds: [],
      landingLinks: [],
      collectionLinks: [],
      tagIds: [tagHistory],
    },
  ];

  for (const a of articles) {
    const row = await ctx.prisma.article.upsert({
      where: { slug: a.slug },
      update: {
        title: a.title,
        content: `# ${a.title}\n\n${a.comment}\n\nFixture content for Admin V3 smoke-check.\n`,
        excerpt: a.comment,
        status: a.status,
        cityId: spb,
        relatedLandingIds: a.relatedLandingIds as unknown as string[],
        relatedCollectionIds: a.relatedCollectionIds as unknown as string[],
        metaTitle: `${a.title} — fixtures`,
        metaDescription: a.comment,
        publishedAt: a.status === 'PUBLISHED' ? new Date() : null,
      },
      create: {
        slug: a.slug,
        title: a.title,
        content: `# ${a.title}\n\n${a.comment}\n\nFixture content for Admin V3 smoke-check.\n`,
        excerpt: a.comment,
        status: a.status,
        cityId: spb,
        relatedLandingIds: a.relatedLandingIds as unknown as string[],
        relatedCollectionIds: a.relatedCollectionIds as unknown as string[],
        metaTitle: `${a.title} — fixtures`,
        metaDescription: a.comment,
        publishedAt: a.status === 'PUBLISHED' ? new Date() : null,
      },
    });

    register(ctx, 'Article', row.id, {
      stableKey: a.stableKey,
      scenario: a.scenario,
      comment: a.comment,
    });

    // Tags
    for (const tagId of a.tagIds) {
      await ctx.prisma.articleTag.upsert({
        where: { articleId_tagId: { articleId: row.id, tagId } },
        update: {},
        create: { articleId: row.id, tagId },
      });
    }

    // Normalized links (canonical)
    for (const l of a.landingLinks) {
      await ctx.prisma.articleLandingLink.upsert({
        where: { articleId_landingId: { articleId: row.id, landingId: l.landingId } },
        update: { position: l.position, priority: 0 },
        create: { articleId: row.id, landingId: l.landingId, position: l.position, priority: 0 },
      });
    }
    for (const c of a.collectionLinks) {
      await ctx.prisma.articleCollectionLink.upsert({
        where: { articleId_collectionId: { articleId: row.id, collectionId: c.collectionId } },
        update: { position: c.position, priority: 0 },
        create: { articleId: row.id, collectionId: c.collectionId, position: c.position, priority: 0 },
      });
    }
  }
}

