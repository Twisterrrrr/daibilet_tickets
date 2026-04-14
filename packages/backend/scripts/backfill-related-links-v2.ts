/**
 * Backfill: migrate legacy linking fields to new FK/join tables.
 *
 * - Article.relatedLandingIds -> ArticleLandingLink (position follows array order)
 * - Article.relatedCollectionIds -> ArticleCollectionLink
 * - Collection.filterTags (tag slugs) -> CollectionTagFilter
 * - LandingPage.filterTag (tag slug) -> LandingPage.filterTagId
 *
 * Safe & idempotent: uses createMany + skipDuplicates where possible.
 *
 * Run:
 *   npx tsx scripts/backfill-related-links-v2.ts
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

import { PrismaClient } from '@prisma/client';

dotenvConfig({ path: path.resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

async function main() {
  console.log('=== Backfill: related links v2 ===');

  // --- 1) LandingPage.filterTag -> filterTagId ---
  {
    const tags = await prisma.tag.findMany({ where: { isDeleted: false }, select: { id: true, slug: true } });
    const tagIdBySlug = new Map(tags.map((t) => [t.slug, t.id]));

    const landings = await prisma.landingPage.findMany({
      where: {
        isDeleted: false,
        filterTagId: null,
      },
      select: { id: true, filterTag: true },
      take: 50_000,
    });

    let updated = 0;
    let skippedNoTag = 0;
    for (const l of landings) {
      const tagId = tagIdBySlug.get(l.filterTag);
      if (!tagId) {
        skippedNoTag += 1;
        continue;
      }
      await prisma.landingPage.update({ where: { id: l.id }, data: { filterTagId: tagId } });
      updated += 1;
    }
    console.log(`LandingPage.filterTagId backfilled: updated=${updated}, skipped_no_tag=${skippedNoTag}`);
  }

  // --- 2) Article String[] -> join tables ---
  {
    const articleIds = await prisma.article.findMany({
      where: { status: { not: 'ARCHIVED' } },
      select: { id: true },
      take: 50_000,
    });

    let linksLandingCreated = 0;
    let linksCollectionCreated = 0;
    let missingLanding = 0;
    let missingCollection = 0;

    for (const { id } of articleIds) {
      const a = await prisma.article.findUnique({
        where: { id },
        select: {
          id: true,
          relatedLandingIds: true,
          relatedCollectionIds: true,
        },
      });
      if (!a) continue;

      const landingIds = uniq((a.relatedLandingIds ?? []).filter(Boolean));
      const collectionIds = uniq((a.relatedCollectionIds ?? []).filter(Boolean));

      if (landingIds.length) {
        const existing = await prisma.landingPage.findMany({
          where: { id: { in: landingIds }, isDeleted: false },
          select: { id: true },
        });
        const existingSet = new Set(existing.map((x) => x.id));
        const data = landingIds
          .filter((landingId) => {
            const ok = existingSet.has(landingId);
            if (!ok) missingLanding += 1;
            return ok;
          })
          .map((landingId, idx) => ({
            articleId: a.id,
            landingId,
            position: idx,
            priority: 0,
          }));
        if (data.length) {
          const res = await prisma.articleLandingLink.createMany({ data, skipDuplicates: true });
          linksLandingCreated += res.count;
        }
      }

      if (collectionIds.length) {
        const existing = await prisma.collection.findMany({
          where: { id: { in: collectionIds }, isDeleted: false },
          select: { id: true },
        });
        const existingSet = new Set(existing.map((x) => x.id));
        const data = collectionIds
          .filter((collectionId) => {
            const ok = existingSet.has(collectionId);
            if (!ok) missingCollection += 1;
            return ok;
          })
          .map((collectionId, idx) => ({
            articleId: a.id,
            collectionId,
            position: idx,
            priority: 0,
          }));
        if (data.length) {
          const res = await prisma.articleCollectionLink.createMany({ data, skipDuplicates: true });
          linksCollectionCreated += res.count;
        }
      }
    }

    console.log(
      `Article links backfilled: landing_links_created=${linksLandingCreated}, collection_links_created=${linksCollectionCreated}, missing_landing_ids=${missingLanding}, missing_collection_ids=${missingCollection}`,
    );
  }

  // --- 3) Collection.filterTags slug[] -> CollectionTagFilter ---
  {
    const tags = await prisma.tag.findMany({ where: { isDeleted: false }, select: { id: true, slug: true } });
    const tagIdBySlug = new Map(tags.map((t) => [t.slug, t.id]));

    const collections = await prisma.collection.findMany({
      where: { isDeleted: false },
      select: { id: true, filterTags: true },
      take: 50_000,
    });

    let created = 0;
    let skippedNoTag = 0;
    for (const c of collections) {
      const slugs = uniq((c.filterTags ?? []).map((s) => String(s).trim()).filter(Boolean));
      if (!slugs.length) continue;

      const data = slugs
        .map((slug, idx) => {
          const tagId = tagIdBySlug.get(slug);
          if (!tagId) {
            skippedNoTag += 1;
            return null;
          }
          return {
            collectionId: c.id,
            tagId,
            position: idx,
            priority: 0,
          };
        })
        .filter((x): x is NonNullable<typeof x> => !!x);

      if (!data.length) continue;
      const res = await prisma.collectionTagFilter.createMany({ data, skipDuplicates: true });
      created += res.count;
    }

    console.log(`CollectionTagFilter backfilled: created=${created}, skipped_no_tag=${skippedNoTag}`);
  }

  console.log('=== Done ===');
}

main()
  .catch((e) => {
    console.error('backfill-related-links-v2 error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

