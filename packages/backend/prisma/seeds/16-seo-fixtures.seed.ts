import type { SeedContext } from './_types';

export async function seedSeoFixtures(ctx: SeedContext): Promise<void> {
  ctx.log.step('16 seo fixtures');

  // SEO audit в проекте строится на реальных сущностях (event/landing/collection/article).
  // Нужные "плохие" кейсы создаются/поддерживаются в seedEvents/seedLandings/seedCollections/seedArticles:
  // - event_without_offers (BROKEN)
  // - event_without_future_sessions (THIN)
  // - landing_kazan_thin (THIN)
  // - collection_spb_broken_missing_slug (BROKEN)
  // - article_broken_missing_landing (BROKEN)
  //
  // Здесь оставляем только “шаг” для прозрачности оркестрации.
  ctx.log.info('SEO fixtures are covered by earlier seeds (events/landings/collections/articles).');
}

