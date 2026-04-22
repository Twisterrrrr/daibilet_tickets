import type { VenueType } from '../../src/prisma-client';
import { FixtureScenario, type SeedContext } from './_types';
import { FIXTURE_IMAGES, register } from './_helpers';

export async function seedVenues(ctx: SeedContext): Promise<void> {
  ctx.log.step('05 venues');

  const spb = ctx.registry.getRequired('city_spb').id;
  const moscow = ctx.registry.getRequired('city_moscow').id;
  const kazan = ctx.registry.getRequired('city_kazan').id;

  const supplierMain = ctx.registry.getRequired('supplier_active_main').id;
  const supplierSmall = ctx.registry.getRequired('supplier_active_small').id;
  const supplierInactive = ctx.registry.getRequired('supplier_inactive').id;

  const venues: Array<{
    stableKey: string;
    slug: string;
    title: string;
    cityId: string;
    operatorId: string | null;
    venueType: VenueType;
    address: string;
    lat: number;
    lng: number;
    isActive: boolean;
    scenario: FixtureScenario;
    comment: string;
  }> = [
    {
      stableKey: 'venue_neva_pier',
      slug: 'venue-neva-pier',
      title: 'Причал на Неве (fixtures)',
      cityId: spb,
      operatorId: supplierMain,
      venueType: 'PARK',
      address: 'Санкт-Петербург, Дворцовая набережная',
      lat: 59.939,
      lng: 30.315,
      isActive: true,
      scenario: FixtureScenario.HAPPY,
      comment: 'Venue для river-cruises событий.',
    },
    {
      stableKey: 'venue_northern_venice_boat',
      slug: 'venue-northern-venice-boat',
      title: 'Северная Венеция — катер (fixtures)',
      cityId: spb,
      operatorId: supplierMain,
      venueType: 'ART_SPACE',
      address: 'Санкт-Петербург, наб. канала Грибоедова',
      lat: 59.927,
      lng: 30.317,
      isActive: true,
      scenario: FixtureScenario.HAPPY,
      comment: 'Второй спб venue для разнообразия.',
    },
    {
      stableKey: 'venue_jazz_water_salon',
      slug: 'venue-jazz-water-salon',
      title: 'Джаз-салон на воде (fixtures)',
      cityId: spb,
      operatorId: supplierSmall,
      venueType: 'THEATER',
      address: 'Санкт-Петербург, Невский пр., 1',
      lat: 59.935,
      lng: 30.325,
      isActive: true,
      scenario: FixtureScenario.HAPPY,
      comment: 'Venue под event_night_jazz.',
    },
    {
      stableKey: 'venue_moscow_history_museum',
      slug: 'venue-moscow-history-museum',
      title: 'Исторический музей (fixtures)',
      cityId: moscow,
      operatorId: supplierMain,
      venueType: 'MUSEUM',
      address: 'Москва, Красная площадь',
      lat: 55.754,
      lng: 37.62,
      isActive: true,
      scenario: FixtureScenario.HAPPY,
      comment: 'Московский venue для museums/history сценариев.',
    },
    {
      stableKey: 'venue_kazan_test_space',
      slug: 'venue-kazan-test-space',
      title: 'Казань — тестовое пространство (fixtures)',
      cityId: kazan,
      operatorId: supplierSmall,
      venueType: 'ART_SPACE',
      address: 'Казань, Баумана, 1',
      lat: 55.79,
      lng: 49.12,
      isActive: true,
      scenario: FixtureScenario.THIN,
      comment: 'Thin venue без насыщенного графа.',
    },
    {
      stableKey: 'venue_inactive_space',
      slug: 'venue-inactive-space',
      title: 'Inactive venue (fixtures)',
      cityId: spb,
      operatorId: supplierInactive,
      venueType: 'GALLERY',
      address: 'Санкт-Петербург, тестовый адрес',
      lat: 59.94,
      lng: 30.33,
      isActive: false,
      scenario: FixtureScenario.INACTIVE,
      comment: 'Неактивная площадка для edge-case.',
    },
  ];

  for (const v of venues) {
    const row = await ctx.prisma.venue.upsert({
      where: { slug: v.slug },
      update: {
        cityId: v.cityId,
        operatorId: v.operatorId ?? undefined,
        title: v.title,
        normalizedName: v.title,
        venueType: v.venueType,
        address: v.address,
        lat: v.lat,
        lng: v.lng,
        imageUrl: FIXTURE_IMAGES.hero1,
        galleryUrls: [FIXTURE_IMAGES.hero1, FIXTURE_IMAGES.hero2],
        isActive: v.isActive,
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        cityId: v.cityId,
        operatorId: v.operatorId ?? undefined,
        slug: v.slug,
        title: v.title,
        normalizedName: v.title,
        venueType: v.venueType,
        address: v.address,
        lat: v.lat,
        lng: v.lng,
        imageUrl: FIXTURE_IMAGES.hero1,
        galleryUrls: [FIXTURE_IMAGES.hero1, FIXTURE_IMAGES.hero2],
        isActive: v.isActive,
        isDeleted: false,
        isPublished: true,
        sourceType: 'MANUAL',
        createdByType: 'ADMIN',
      },
    });

    register(ctx, 'Venue', row.id, {
      stableKey: v.stableKey,
      scenario: v.scenario,
      comment: v.comment,
    });
  }
}

