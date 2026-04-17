import { FixtureScenario, type SeedContext } from './_types';
import { register } from './_helpers';

export async function seedFavorites(ctx: SeedContext): Promise<void> {
  ctx.log.step('10 favorites');

  const userFav = ctx.registry.getRequired('user_with_favorites').id;
  const userLight = ctx.registry.getRequired('user_light').id;

  const eventNeva = ctx.registry.getRequired('event_neva_cruise').id;
  const eventInactive = ctx.registry.getRequired('event_inactive').id;

  // Known slugs from seedEvents (stable, used as legacy key)
  const slugNeva = 'fixture-neva-cruise';
  const slugInactive = 'fixture-inactive-event';

  const favs: Array<{
    stableKey: string;
    userId: string;
    eventSlug: string;
    eventId: string | null;
    scenario: FixtureScenario;
    comment: string;
  }> = [
    {
      stableKey: 'favorite_legacy_only',
      userId: userFav,
      eventSlug: slugNeva,
      eventId: null,
      scenario: FixtureScenario.LEGACY_ONLY,
      comment: 'LEGACY_ONLY: только eventSlug, eventId=null (но slug существует).',
    },
    {
      stableKey: 'favorite_normalized_only',
      userId: userFav,
      eventSlug: slugNeva,
      eventId: eventNeva,
      scenario: FixtureScenario.NORMALIZED_ONLY,
      comment: 'NORMALIZED_ONLY: eventId заполнен (dual-write), slug синхронен.',
    },
    {
      stableKey: 'favorite_mixed',
      userId: userLight,
      eventSlug: slugNeva,
      eventId: eventNeva,
      scenario: FixtureScenario.MIXED,
      comment: 'MIXED: заполнены и slug, и eventId.',
    },
    {
      stableKey: 'favorite_missing_event_slug',
      userId: userLight,
      eventSlug: 'missing-event-slug',
      eventId: null,
      scenario: FixtureScenario.BROKEN,
      comment: 'BROKEN: orphan favorite по несуществующему slug.',
    },
    {
      stableKey: 'favorite_inactive_target',
      userId: userFav,
      eventSlug: slugInactive,
      eventId: eventInactive,
      scenario: FixtureScenario.INACTIVE,
      comment: 'INACTIVE: favorite на неактивное событие.',
    },
  ];

  for (const f of favs) {
    const row = await ctx.prisma.userFavorite.upsert({
      where: { userId_eventSlug: { userId: f.userId, eventSlug: f.eventSlug } },
      update: { eventId: f.eventId ?? undefined },
      create: { userId: f.userId, eventSlug: f.eventSlug, eventId: f.eventId ?? undefined },
    });

    register(ctx, 'UserFavorite', row.id, {
      stableKey: f.stableKey,
      scenario: f.scenario,
      comment: f.comment,
    });
  }
}

