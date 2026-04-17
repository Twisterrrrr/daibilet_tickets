import type { OfferSource, PurchaseType, SeedContext } from '../../src/prisma-client';
import { FixtureScenario } from './_types';
import { FIXTURE_IMAGES, atHour, asKopecks, register } from './_helpers';

export async function seedEvents(ctx: SeedContext): Promise<void> {
  ctx.log.step('06 events + offers + sessions');

  const spb = ctx.registry.getRequired('city_spb').id;
  const moscow = ctx.registry.getRequired('city_moscow').id;

  const supplierMain = ctx.registry.getRequired('supplier_active_main').id;
  const supplierSmall = ctx.registry.getRequired('supplier_active_small').id;

  const venueNeva = ctx.registry.getRequired('venue_neva_pier').id;
  const venueJazz = ctx.registry.getRequired('venue_jazz_water_salon').id;
  const venueMoscow = ctx.registry.getRequired('venue_moscow_history_museum').id;

  const events: Array<{
    stableKey: string;
    slug: string;
    title: string;
    cityId: string;
    supplierId: string | null;
    venueId: string | null;
    scenario: FixtureScenario;
    isActive: boolean;
    comment: string;
    withOffersAndSessions: boolean;
  }> = [
    {
      stableKey: 'event_neva_cruise',
      slug: 'fixture-neva-cruise',
      title: 'Прогулка по Неве (fixtures)',
      cityId: spb,
      supplierId: supplierMain,
      venueId: venueNeva,
      scenario: FixtureScenario.HAPPY,
      isActive: true,
      comment: 'HAPPY: активное/published событие с offers + sessions (river_cruises / city_excursions).',
      withOffersAndSessions: true,
    },
    {
      stableKey: 'event_night_jazz',
      slug: 'fixture-night-jazz',
      title: 'Ночной джаз на воде (fixtures)',
      cityId: spb,
      supplierId: supplierSmall,
      venueId: venueJazz,
      scenario: FixtureScenario.HAPPY,
      isActive: true,
      comment: 'HAPPY: jazz + night_cruises.',
      withOffersAndSessions: true,
    },
    {
      stableKey: 'event_kids_sailor',
      slug: 'fixture-kids-sailor',
      title: 'Юный матрос (fixtures)',
      cityId: spb,
      supplierId: supplierMain,
      venueId: venueNeva,
      scenario: FixtureScenario.HAPPY,
      isActive: true,
      comment: 'HAPPY: kids/family.',
      withOffersAndSessions: true,
    },
    {
      stableKey: 'event_without_venue',
      slug: 'fixture-broken-without-venue',
      title: 'Событие без площадки (broken fixtures)',
      cityId: spb,
      supplierId: supplierMain,
      venueId: null,
      scenario: FixtureScenario.BROKEN,
      isActive: true,
      comment: 'BROKEN: без venueId для SEO/quality фикстур.',
      withOffersAndSessions: true,
    },
    {
      stableKey: 'event_without_offers',
      slug: 'fixture-broken-without-offers',
      title: 'Событие без офферов (broken fixtures)',
      cityId: spb,
      supplierId: supplierMain,
      venueId: venueNeva,
      scenario: FixtureScenario.BROKEN,
      isActive: true,
      comment: 'BROKEN: без offers (publish-gate/SEO audit).',
      withOffersAndSessions: false,
    },
    {
      stableKey: 'event_without_future_sessions',
      slug: 'fixture-thin-no-future-sessions',
      title: 'Событие без будущих сеансов (thin fixtures)',
      cityId: spb,
      supplierId: supplierMain,
      venueId: venueNeva,
      scenario: FixtureScenario.THIN,
      isActive: true,
      comment: 'THIN: sessions только в прошлом (для thin/availability).',
      withOffersAndSessions: true,
    },
    {
      stableKey: 'event_inactive',
      slug: 'fixture-inactive-event',
      title: 'Неактивное событие (fixtures)',
      cityId: spb,
      supplierId: supplierMain,
      venueId: venueNeva,
      scenario: FixtureScenario.INACTIVE,
      isActive: false,
      comment: 'INACTIVE: isActive=false.',
      withOffersAndSessions: true,
    },
    {
      stableKey: 'event_moscow_museum',
      slug: 'fixture-moscow-museum',
      title: 'Билет в музей (fixtures)',
      cityId: moscow,
      supplierId: supplierMain,
      venueId: venueMoscow,
      scenario: FixtureScenario.HAPPY,
      isActive: true,
      comment: 'Москва: музейный кейс.',
      withOffersAndSessions: true,
    },
  ];

  const now = ctx.now;

  const fixtureCategoryAndSubs = (stableKey: string): { category: 'EXCURSION' | 'MUSEUM' | 'EVENT'; subcategories: string[] } => {
    if (stableKey === 'event_moscow_museum') return { category: 'MUSEUM', subcategories: ['MUSEUM_CLASSIC'] };
    if (stableKey === 'event_night_jazz') return { category: 'EVENT', subcategories: ['JAZZ'] };
    return { category: 'EXCURSION', subcategories: ['RIVER'] };
  };

  for (const e of events) {
    const catSubs = fixtureCategoryAndSubs(e.stableKey);
    const row = await ctx.prisma.event.upsert({
      where: { slug: e.slug },
      update: {
        cityId: e.cityId,
        supplierId: e.supplierId ?? undefined,
        venueId: e.venueId ?? undefined,
        title: e.title,
        description: `Fixture event (${e.slug}). ${e.comment}`,
        shortDescription: e.title,
        source: 'MANUAL',
        tcEventId: `fixture-${e.slug}`,
        category: catSubs.category,
        audience: e.slug.includes('kids') ? 'KIDS' : 'ALL',
        subcategories: catSubs.subcategories,
        isActive: e.isActive,
        imageUrl: FIXTURE_IMAGES.hero1,
        galleryUrls: [FIXTURE_IMAGES.hero1, FIXTURE_IMAGES.hero2],
        priceFrom: e.withOffersAndSessions ? asKopecks(1200) : null,
        isDeleted: false,
        moderationStatus: 'APPROVED',
        createdByType: 'ADMIN',
      },
      create: {
        cityId: e.cityId,
        supplierId: e.supplierId ?? undefined,
        venueId: e.venueId ?? undefined,
        title: e.title,
        slug: e.slug,
        description: `Fixture event (${e.slug}). ${e.comment}`,
        shortDescription: e.title,
        source: 'MANUAL',
        tcEventId: `fixture-${e.slug}`,
        category: catSubs.category,
        audience: e.slug.includes('kids') ? 'KIDS' : 'ALL',
        subcategories: catSubs.subcategories,
        minAge: 0,
        durationMinutes: 90,
        address: 'Fixture address',
        priceFrom: e.withOffersAndSessions ? asKopecks(1200) : null,
        isActive: e.isActive,
        imageUrl: FIXTURE_IMAGES.hero1,
        galleryUrls: [FIXTURE_IMAGES.hero1, FIXTURE_IMAGES.hero2],
        operatorId: e.supplierId ?? undefined,
        moderationStatus: 'APPROVED',
        createdByType: 'ADMIN',
      },
    });

    register(ctx, 'Event', row.id, {
      stableKey: e.stableKey,
      scenario: e.scenario,
      comment: e.comment,
    });

    // Tags for EventTag (для C-semantics)
    const tagsToLink: string[] = [];
    if (e.stableKey === 'event_neva_cruise') tagsToLink.push('tag_river_cruises', 'tag_city_excursions');
    if (e.stableKey === 'event_night_jazz') tagsToLink.push('tag_jazz', 'tag_night_cruises');
    if (e.stableKey === 'event_kids_sailor') tagsToLink.push('tag_kids', 'tag_family');
    if (e.stableKey === 'event_moscow_museum') tagsToLink.push('tag_museums', 'tag_history');

    for (const tk of tagsToLink) {
      const tagId = ctx.registry.getRequired(tk).id;
      await ctx.prisma.eventTag.upsert({
        where: { eventId_tagId: { eventId: row.id, tagId } },
        update: {},
        create: { eventId: row.id, tagId, assignmentSource: 'MANUAL_ADMIN' },
      });
    }

    if (!e.withOffersAndSessions) continue;

    const offerSource: OfferSource = 'MANUAL';
    const purchaseType: PurchaseType = 'REQUEST';

    const offer = await ctx.prisma.eventOffer.upsert({
      where: { source_externalEventId: { source: offerSource, externalEventId: `fixture-offer-${e.slug}` } },
      update: {
        eventId: row.id,
        purchaseType,
        status: e.isActive ? 'ACTIVE' : 'DISABLED',
        isPrimary: true,
        priceFrom: asKopecks(1200),
        widgetProvider: null,
        widgetPayload: null,
        externalData: { fixtureKey: `offer:${e.slug}` } as unknown,
      },
      create: {
        eventId: row.id,
        source: offerSource,
        purchaseType,
        externalEventId: `fixture-offer-${e.slug}`,
        priceFrom: asKopecks(1200),
        status: e.isActive ? 'ACTIVE' : 'DISABLED',
        isPrimary: true,
        operatorId: e.supplierId ?? undefined,
        venueId: e.venueId ?? undefined,
        externalData: { fixtureKey: `offer:${e.slug}` } as unknown,
      },
    });

    // Sessions
    const makeStarts = () => {
      if (e.stableKey === 'event_without_future_sessions') {
        return [atHour(now, -10, 12, 0), atHour(now, -9, 18, 0)];
      }
      return [atHour(now, 2, 12, 0), atHour(now, 5, 18, 0)];
    };

    for (const startsAt of makeStarts()) {
      const existing = await ctx.prisma.eventSession.findFirst({
        where: { eventId: row.id, offerId: offer.id, startsAt },
      });
      if (existing) continue;
      await ctx.prisma.eventSession.create({
        data: {
          eventId: row.id,
          offerId: offer.id,
            tcSessionId: `fixture-session:${e.slug}:${startsAt.toISOString()}`,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 90 * 60_000),
            prices: [],
            availableTickets: 30,
            capacityTotal: 30,
          isActive: true,
        },
      });
    }
  }
}

