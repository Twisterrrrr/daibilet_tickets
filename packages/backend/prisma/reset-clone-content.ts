/**
 * Reset-track utility: clone "content layer" from SOURCE DB to TARGET DB.
 *
 * Intended use: new clean DB (TARGET) + keep only cities/landings/collections (+SEO/promo scaffolding).
 *
 * Usage:
 *   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... pnpm --filter @daibilet/backend db:reset:clone-content
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '../../.env') });

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing required env: ${name}`);
  return v.trim();
}

function prismaFor(url: string) {
  return new PrismaClient({
    datasources: {
      db: { url },
    },
  });
}

async function main() {
  const sourceUrl = mustGetEnv('SOURCE_DATABASE_URL');
  const targetUrl = mustGetEnv('TARGET_DATABASE_URL');
  if (sourceUrl === targetUrl) {
    throw new Error('SOURCE_DATABASE_URL and TARGET_DATABASE_URL must be different (safety check)');
  }

  const src = prismaFor(sourceUrl);
  const dst = prismaFor(targetUrl);

  console.log('Reset clone: starting...');

  try {
    // Read all content entities from source
    const [cities, regions, regionCities, tags, collections, landings, promoCollections, promoRules, promoBlocks, promoItems] =
      await Promise.all([
        src.city.findMany(),
        src.region.findMany(),
        src.regionCity.findMany(),
        src.tag.findMany(),
        src.collection.findMany(),
        src.landingPage.findMany(),
        src.promoCollection.findMany(),
        src.promoCollectionRule.findMany(),
        src.promoBlock.findMany(),
        src.promoCollectionItem.findMany({
          // Only safe-to-clone items that do not reference Event/Venue (reset DB has none)
          where: { eventId: null, venueId: null },
        }),
      ]);

    console.log(
      `Source rows: cities=${cities.length}, regions=${regions.length}, tags=${tags.length}, collections=${collections.length}, landings=${landings.length}`,
    );

    // Wipe target content tables to ensure id-stable re-import
    // Order: child tables first
    await dst.promoCollectionItem.deleteMany({});
    await dst.promoBlock.deleteMany({});
    await dst.promoCollectionRule.deleteMany({});
    await dst.promoCollection.deleteMany({});

    await dst.landingPage.deleteMany({});
    await dst.collection.deleteMany({});

    await dst.tag.deleteMany({});

    await dst.regionCity.deleteMany({});
    await dst.region.deleteMany({});
    await dst.city.deleteMany({});

    // Insert: parent tables first
    if (cities.length) await dst.city.createMany({ data: cities });
    if (regions.length) await dst.region.createMany({ data: regions });
    if (regionCities.length) await dst.regionCity.createMany({ data: regionCities });

    if (tags.length) await dst.tag.createMany({ data: tags });
    if (collections.length) await dst.collection.createMany({ data: collections });
    if (landings.length) await dst.landingPage.createMany({ data: landings });

    if (promoCollections.length) await dst.promoCollection.createMany({ data: promoCollections });
    if (promoRules.length) await dst.promoCollectionRule.createMany({ data: promoRules });
    if (promoBlocks.length) await dst.promoBlock.createMany({ data: promoBlocks });
    if (promoItems.length) await dst.promoCollectionItem.createMany({ data: promoItems });

    console.log('Reset clone: done.');
    console.log(
      `Target rows: cities=${cities.length}, landings=${landings.length}, collections=${collections.length}, promoBlocks=${promoBlocks.length}`,
    );
  } finally {
    await Promise.allSettled([src.$disconnect(), dst.$disconnect()]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

