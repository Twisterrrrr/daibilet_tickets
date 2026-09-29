/**
 * Seed seasonal landing infra for "Салют 9 мая":
 * - ensure Tag(slug="salyut-9-maya")
 * - ensure HUB LandingPage (MULTI_CITY, slug="salute-9-may")
 * - ensure CITY LandingPages (CITY, slug="salute-9-may") for selected cities
 * - tag events in those cities with title containing "салют" -> EventTag(tagId)
 *
 * Usage (packages/backend):
 *   npx tsx scripts/seed-salute-9-may-city-landings.ts --apply
 *
 * Notes:
 * - Minimal & reversible: only creates/updates specific rows; tagging is idempotent (skipDuplicates).
 * - Activation is intentionally NOT done here (backend guards require non-empty resolved results).
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

import { TagCategory } from '@/prisma-client';
import { createScriptPrismaClient } from './_prisma';
import { SALUTE_9_MAY_LANDING_SEEDS } from '../prisma/salute-9-may-landings.data';

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const APPLY = hasFlag('apply');

const SALUTE_TAG_SLUG = 'salyut-9-maya';
const SALUTE_LANDING_SLUG = 'salute-9-may';

const TARGET_CITY_SLUGS = ['saint-petersburg', 'moscow', 'kazan', 'nizhny-novgorod'] as const;

async function main() {
  dotenvConfig({ path: path.resolve(process.cwd(), '../../.env') });
  dotenvConfig({ path: path.resolve(process.cwd(), '.env') });

  const { prisma, pool } = createScriptPrismaClient();
  await prisma.$connect();

  try {
    console.log('');
    console.log(`[salute-9-may] Mode: ${APPLY ? 'APPLY' : 'DRY-RUN (add --apply)'}`);

    const tagExisting = await prisma.tag.findUnique({
      where: { slug: SALUTE_TAG_SLUG },
      select: { id: true, slug: true, name: true, isDeleted: true, isActive: true },
    });

    const tag =
      tagExisting ??
      (APPLY
        ? await prisma.tag.create({
            data: {
              slug: SALUTE_TAG_SLUG,
              name: 'Салют 9 мая',
              category: TagCategory.SPECIAL,
              isActive: true,
              isDeleted: false,
            },
            select: { id: true, slug: true, name: true, isDeleted: true, isActive: true },
          })
        : null);

    if (!tagExisting && !tag) {
      console.log(`[salute-9-may] Tag missing: ${SALUTE_TAG_SLUG} (DRY-RUN: would create)`);
      return;
    }
    if (!tag) throw new Error('Unexpected: tag not resolved');

    console.log(`[salute-9-may] Tag: ${tag.slug} (${tag.id})`);

    // HUB (MULTI_CITY)
    const hubExisting = await prisma.landingPage.findFirst({
      where: { isDeleted: false, slug: SALUTE_LANDING_SLUG, landingType: 'MULTI_CITY' },
      select: { id: true, slug: true, title: true, filterTag: true, filterTagId: true, isActive: true, status: true },
    });

    const hub =
      hubExisting ??
      (APPLY
        ? await prisma.landingPage.create({
            data: {
              slug: SALUTE_LANDING_SLUG,
              landingType: 'MULTI_CITY',
              cityId: null,
              parentLandingId: null,
              filterTag: SALUTE_TAG_SLUG,
              filterTagId: tag.id,
              title: 'Салют 9 мая — по городам',
              metaTitle: 'Салют 9 мая 2026 — где смотреть по городам России | Дайбилет',
              metaDescription: 'Выберите город и сравните варианты: теплоходы, рестораны, крыши и обзорные точки.',
              seasonalPayload: { seasonWindow: { startMonthDay: '03-01', endMonthDay: '05-09' } },
              isActive: false,
              isIndexable: false,
              status: 'DRAFT',
              templateType: 'SEASONAL_EVENT',
            } as any,
            select: { id: true, slug: true, title: true },
          })
        : null);

    if (!hubExisting && !hub) {
      console.log(`[salute-9-may] HUB missing (DRY-RUN: would create)`);
      return;
    }
    if (!hub) throw new Error('Unexpected: hub not resolved');

    console.log(`[salute-9-may] HUB: ${hub.slug} (${hub.id})`);

    for (const citySlug of TARGET_CITY_SLUGS) {
      console.log('');
      console.log(`[salute-9-may] City: ${citySlug}`);

      const city = await prisma.city.findFirst({ where: { slug: citySlug }, select: { id: true, slug: true, name: true } });
      if (!city) {
        console.log(`[salute-9-may]  - city not found`);
        continue;
      }

      const seed = SALUTE_9_MAY_LANDING_SEEDS.find((s) => s.citySlug === citySlug) ?? null;
      const seasonalPayload = seed?.seasonalPayload ?? { seasonWindow: { startMonthDay: '03-01', endMonthDay: '05-09' }, viewpoints: [], tips: [] };

      const landingExisting = await prisma.landingPage.findFirst({
        where: { isDeleted: false, cityId: city.id, landingType: 'CITY', slug: SALUTE_LANDING_SLUG },
        select: { id: true, slug: true, title: true, parentLandingId: true, filterTag: true, filterTagId: true, templateType: true },
      });

      if (!landingExisting) {
        if (APPLY) {
          const created = await prisma.landingPage.create({
            data: {
              slug: SALUTE_LANDING_SLUG,
              landingType: 'CITY',
              cityId: city.id,
              parentLandingId: hub.id,
              filterTag: SALUTE_TAG_SLUG,
              filterTagId: tag.id,
              title: seed?.title ?? 'Салют 9 мая — расписание и цены',
              subtitle: seed?.subtitle ?? null,
              heroText: seed?.heroText ?? null,
              metaTitle: seed?.metaTitle ?? null,
              metaDescription: seed?.metaDescription ?? null,
              howToChoose: seed?.howToChoose ?? null,
              faq: seed?.faq ?? null,
              reviews: seed?.reviews ?? null,
              relatedLinks: seed?.relatedLinks ?? null,
              seasonalPayload,
              templateType: 'SEASONAL_EVENT',
              isActive: false,
              isIndexable: false,
              status: 'DRAFT',
            } as any,
            select: { id: true, slug: true, title: true },
          });
          console.log(`[salute-9-may]  - city landing created: ${created.slug} (${created.id})`);
        } else {
          console.log(`[salute-9-may]  - city landing missing (DRY-RUN: would create)`); 
        }
      } else {
        // Ensure linkage & tag fields are correct (idempotent)
        if (APPLY) {
          await prisma.landingPage.update({
            where: { id: landingExisting.id },
            data: {
              parentLandingId: hub.id,
              filterTag: SALUTE_TAG_SLUG,
              filterTagId: tag.id,
              templateType: landingExisting.templateType ?? 'SEASONAL_EVENT',
              seasonalPayload,
            } as any,
          });
        }
        console.log(`[salute-9-may]  - city landing ok: ${landingExisting.slug} (${landingExisting.id})`);
      }

      // Tag events containing "салют" in title (in that city)
      const events = await prisma.event.findMany({
        where: {
          isDeleted: false,
          cityId: city.id,
          title: { contains: 'салют', mode: 'insensitive' },
        },
        select: { id: true, slug: true, title: true, source: true, isActive: true },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      });

      console.log(`[salute-9-may]  - events with "салют" in title: ${events.length}`);

      if (events.length > 0 && APPLY) {
        const res = await prisma.eventTag.createMany({
          data: events.map((e) => ({
            eventId: e.id,
            tagId: tag.id,
            assignmentSource: 'MANUAL_ADMIN' as any,
          })),
          skipDuplicates: true,
        });
        console.log(`[salute-9-may]  - tags linked (new): ${res.count}`);
      }

      // Quick readiness signal: tagged events with future active sessions
      const now = new Date();
      const readyCount = await prisma.event.count({
        where: {
          isDeleted: false,
          isActive: true,
          cityId: city.id,
          tags: { some: { tagId: tag.id } },
          sessions: { some: { isActive: true, canceledAt: null, startsAt: { gt: now } } },
        },
      });
      console.log(`[salute-9-may]  - tagged+future sessions (for landing readiness): ${readyCount}`);
    }

    console.log('\n[salute-9-may] Done.');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('[salute-9-may] Failed:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});

