import type { PrismaClient } from '../../src/prisma-client';

import { createSeedRegistry } from './_registry';
import { createSeedLogger } from './_helpers';
import type { SeedContext } from './_types';

import { seedCoreReference } from './00-core-reference.seed';
import { seedCities } from './01-cities.seed';
import { seedSuppliers } from './02-suppliers.seed';
import { seedTags } from './03-tags.seed';
import { seedSubcategories } from './04-subcategories.seed';
import { seedVenues } from './05-venues.seed';
import { seedEvents } from './06-events.seed';
import { seedLandings } from './07-landings.seed';
import { seedCollections } from './08-collections.seed';
import { seedArticles } from './09-articles.seed';
import { seedCustomers } from './11-customers.seed';
import { seedFavorites } from './10-favorites.seed';
import { seedOrders } from './12-orders.seed';
import { seedRefunds } from './13-refunds.seed';
import { seedPromoBlocks } from './14-promo-blocks.seed';
import { seedStaffUsers } from './15-staff-users.seed';
import { seedSeoFixtures } from './16-seo-fixtures.seed';

export async function seedFoundationFixtures(prisma: PrismaClient): Promise<{ refs: number }> {
  const registry = createSeedRegistry();
  const log = createSeedLogger('foundation-fixtures');
  const ctx: SeedContext = { prisma, registry, log, now: new Date() };

  // NOTE: порядок чуть скорректирован по dependency graph:
  // users нужны для favorites → поэтому customers раньше favorites.
  await seedCoreReference(ctx);
  await seedCities(ctx);
  await seedSuppliers(ctx);
  await seedTags(ctx);
  await seedSubcategories(ctx);
  await seedVenues(ctx);
  await seedEvents(ctx);
  await seedLandings(ctx);
  await seedCollections(ctx);
  await seedArticles(ctx);
  await seedCustomers(ctx);
  await seedFavorites(ctx);
  await seedOrders(ctx);
  await seedRefunds(ctx);
  await seedPromoBlocks(ctx);
  await seedStaffUsers(ctx);
  await seedSeoFixtures(ctx);

  log.step('summary');
  log.info(`registry refs: ${registry.refs.size}`);
  return { refs: registry.refs.size };
}

