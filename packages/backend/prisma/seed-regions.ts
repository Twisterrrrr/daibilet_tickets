/**
 * Seed: Регионы — маппинг городов по зонам транспортной доступности (1–2 часа).
 * Запуск: DATABASE_URL=... npx tsx prisma/seed-regions.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RegionDef {
  slug: string;
  name: string;
  description: string;
  hubCitySlug: string;
  citySlugs: string[]; // города, входящие в регион (без хаба — он включается автоматически)
}

const REGIONS: RegionDef[] = [
  {
    slug: 'moskovskaya-oblast',
    name: 'Московская область',
    description:
      'События и мероприятия Подмосковья — Коломна, Серпухов, Дубна и другие города в 1–2 часах от Москвы.',
    hubCitySlug: 'moscow',
    citySlugs: [
      'balashiha',
      'dolgoprudnyj',
      'dubna-moskovskaya-oblast',
      'kolomna',
      'korolyov',
      'moskovskij',
      'ramenskoe',
      'reutov',
      'serpuhov',
      'shchyolkovo',
    ],
  },
  {
    slug: 'tatarstan',
    name: 'Татарстан',
    description:
      'События Татарстана — Казань, Набережные Челны и другие города республики. Экскурсии, концерты и культурные мероприятия.',
    hubCitySlug: 'kazan',
    citySlugs: ['naberezhnye-chelny'],
  },
  {
    slug: 'leningradskaya-oblast',
    name: 'Ленинградская область',
    description:
      'События Ленинградской области — дворцы, крепости и природа в 1–2 часах от Санкт-Петербурга.',
    hubCitySlug: 'saint-petersburg',
    citySlugs: [], // пока нет отдельных городов ЛО в базе; хаб СПб включается автоматически
  },
  {
    slug: 'zolotoe-koltso',
    name: 'Золотое кольцо',
    description:
      'События Золотого кольца России — Ярославль, Владимир, Суздаль, Иваново, Рыбинск. Древние города с тысячелетней историей.',
    hubCitySlug: 'yaroslavl',
    citySlugs: ['vladimir', 'suzdal', 'ivanovo', 'kovrov', 'rybinsk'],
  },
  {
    slug: 'sverdlovskaya-oblast',
    name: 'Свердловская область',
    description:
      'События Свердловской области — Екатеринбург, Нижний Тагил и города Урала.',
    hubCitySlug: 'ekaterinburg',
    citySlugs: ['nizhnij-tagil'],
  },
  {
    slug: 'kemerovskaya-oblast',
    name: 'Кемеровская область',
    description:
      'События Кузбасса — Кемерово, Новокузнецк, Междуреченск.',
    hubCitySlug: 'kemerovo',
    citySlugs: ['novokuznetsk', 'mezhdurechensk'],
  },
  {
    slug: 'nizhegorodskaya-oblast',
    name: 'Нижегородская область',
    description:
      'События Нижегородской области — Нижний Новгород, Арзамас и города в зоне доступности.',
    hubCitySlug: 'nizhny-novgorod',
    citySlugs: ['nizhnij-novgorod', 'arzamas'],
  },
];

async function main() {
  console.log('Seeding regions...');

  for (const def of REGIONS) {
    // Найти хаб-город
    const hubCity = await prisma.city.findUnique({ where: { slug: def.hubCitySlug } });
    if (!hubCity) {
      console.warn(`  Hub city "${def.hubCitySlug}" not found — skipping region "${def.name}"`);
      continue;
    }

    // Найти все связанные города
    const memberCities = await prisma.city.findMany({
      where: { slug: { in: def.citySlugs } },
      select: { id: true, slug: true },
    });

    const foundSlugs = memberCities.map((c) => c.slug);
    const missingSlugs = def.citySlugs.filter((s) => !foundSlugs.includes(s));
    if (missingSlugs.length > 0) {
      console.warn(`  Region "${def.name}": cities not found: ${missingSlugs.join(', ')}`);
    }

    // Все города региона = хаб + member cities
    const allCityIds = [hubCity.id, ...memberCities.map((c) => c.id)];
    // Убираем дубли (если хаб попал в citySlugs)
    const uniqueCityIds = [...new Set(allCityIds)];

    // Upsert региона
    const region = await prisma.region.upsert({
      where: { slug: def.slug },
      update: {
        name: def.name,
        description: def.description,
        hubCityId: hubCity.id,
      },
      create: {
        slug: def.slug,
        name: def.name,
        description: def.description,
        hubCityId: hubCity.id,
      },
    });

    // Синхронизация связей: удалить старые, добавить новые
    await prisma.regionCity.deleteMany({ where: { regionId: region.id } });
    await prisma.regionCity.createMany({
      data: uniqueCityIds.map((cityId) => ({ regionId: region.id, cityId })),
    });

    console.log(
      `  ✓ ${def.name} (hub: ${def.hubCitySlug}) — ${uniqueCityIds.length} cities`,
    );
  }

  console.log('Done!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
