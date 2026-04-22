/**
 * Minimal bootstrap for geo dictionaries (District / MetroStation) for local/dev verification.
 *
 * Usage:
 *   npx tsx scripts/geo-bootstrap-minimal.ts --citySlug=saint-petersburg
 *
 * Safe: creates rows only if missing (by unique [cityId, slug]).
 */
import { PrismaClient } from '../src/generated/prisma/client';

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p?.split('=')[1]?.trim() || undefined;
}

async function main() {
  const citySlug = arg('citySlug') ?? 'saint-petersburg';
  const prisma = new PrismaClient();
  try {
    const city = await prisma.city.findFirst({ where: { slug: citySlug }, select: { id: true, name: true, slug: true } });
    if (!city) {
      throw new Error(`City not found for slug=${citySlug}`);
    }

    const districts = [
      { slug: 'center', name: 'Центр' },
      { slug: 'vasileostrovskiy', name: 'Василеостровский' },
    ];
    const metros = [
      { slug: 'nevskiy-prospekt', name: 'Невский проспект', lineName: 'M2', lineColor: '#0078C9' },
      { slug: 'gostiny-dvor', name: 'Гостиный двор', lineName: 'M2', lineColor: '#0078C9' },
    ];

    for (const d of districts) {
      await prisma.district.upsert({
        where: { cityId_slug: { cityId: city.id, slug: d.slug } },
        create: { cityId: city.id, slug: d.slug, name: d.name },
        update: {},
      });
    }

    for (const m of metros) {
      await prisma.metroStation.upsert({
        where: { cityId_slug: { cityId: city.id, slug: m.slug } },
        create: {
          cityId: city.id,
          slug: m.slug,
          name: m.name,
          lineName: m.lineName,
          lineColor: m.lineColor,
        },
        update: {},
      });
    }

    console.log(`OK: bootstrapped geo fixtures for ${city.name} (${city.slug})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
