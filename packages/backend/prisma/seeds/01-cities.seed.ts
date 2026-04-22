import { FixtureScenario, type SeedContext } from './_types';
import { register, upsertCity } from './_helpers';

export async function seedCities(ctx: SeedContext): Promise<void> {
  ctx.log.step('01 cities');

  const spb = await upsertCity(ctx.prisma, {
    slug: 'saint-petersburg',
    name: 'Санкт-Петербург',
    description: 'Fixture: основной город для вертикального среза Admin V3.',
    lat: 59.9343,
    lng: 30.3351,
    timezone: 'Europe/Moscow',
    metaTitle: 'Санкт-Петербург — fixtures',
    metaDescription: 'Fixture city: Санкт-Петербург',
    isFeatured: true,
    isActive: true,
  });
  register(ctx, 'City', spb.id, {
    stableKey: 'city_spb',
    scenario: FixtureScenario.HAPPY,
    comment: 'Насыщенный граф для smoke-check Admin V3 (основной город).',
  });

  const moscow = await upsertCity(ctx.prisma, {
    slug: 'moscow',
    name: 'Москва',
    description: 'Fixture: средний граф.',
    lat: 55.7558,
    lng: 37.6173,
    timezone: 'Europe/Moscow',
    metaTitle: 'Москва — fixtures',
    metaDescription: 'Fixture city: Москва',
    isFeatured: true,
    isActive: true,
  });
  register(ctx, 'City', moscow.id, {
    stableKey: 'city_moscow',
    scenario: FixtureScenario.HAPPY,
    comment: 'Средний граф для проверки фильтров и UI.',
  });

  const kazan = await upsertCity(ctx.prisma, {
    slug: 'kazan',
    name: 'Казань',
    description: 'Fixture: thin сценарий (минимум сущностей).',
    lat: 55.7961,
    lng: 49.1064,
    timezone: 'Europe/Moscow',
    metaTitle: 'Казань — fixtures',
    metaDescription: 'Fixture city: Казань',
    isFeatured: false,
    isActive: true,
  });
  register(ctx, 'City', kazan.id, {
    stableKey: 'city_kazan',
    scenario: FixtureScenario.THIN,
    comment: 'Thin город: почти пустой граф (SEO/тонкие страницы).',
  });
}

