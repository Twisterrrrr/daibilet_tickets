/**
 * Legacy classification: маппинг старых тегов → category + subcategoryId (M:N).
 * Условие применения по умолчанию: нет event_subcategory_links и пустой legacy enum subcategories.
 * --force — попытаться добавить связи даже при уже заполненной таксономии.
 * --apply — писать в БД (иначе только отчёт).
 *
 * pnpm --filter @daibilet/backend exec npx tsx scripts/legacyClassificationFix.ts --map=scripts/data/legacy-classification-map.json
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';

import { EventCategory, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type MapEntry = { category?: EventCategory; subcategoryId?: string };
type MappingFile = Record<string, MapEntry | string>;

function loadMapping(mapPath: string): Record<string, MapEntry> {
  const raw = JSON.parse(readFileSync(mapPath, 'utf8')) as MappingFile;
  const out: Record<string, MapEntry> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    if (typeof v === 'string') {
      out[k] = { subcategoryId: v };
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function main() {
  const mapArg = process.argv.find((a) => a.startsWith('--map='));
  const mapPath = mapArg
    ? path.resolve(process.cwd(), mapArg.slice('--map='.length))
    : path.join(process.cwd(), 'scripts', 'data', 'legacy-classification-map.json');
  const apply = process.argv.includes('--apply');
  const force = process.argv.includes('--force');

  if (!existsSync(mapPath)) {
    console.error(JSON.stringify({ error: 'map_not_found', mapPath }));
    process.exit(1);
  }

  const mapping = loadMapping(mapPath);
  const events = await prisma.event.findMany({
    where: { isActive: true, isDeleted: false, canonicalOfId: null },
    include: {
      tags: { include: { tag: { select: { slug: true } } } },
      subcategoryLinks: { select: { subcategoryId: true } },
    },
  });

  const report = {
    mapPath,
    apply,
    force,
    wouldUpdate: 0,
    applied: 0,
    skipped: 0,
    conflicts: [] as Record<string, unknown>[],
  };

  for (const event of events) {
    const tagSlugs = event.tags.map((t) => t.tag.slug).filter(Boolean) as string[];
    const hits: Array<{ slug: string; entry: MapEntry }> = [];
    for (const slug of tagSlugs) {
      const entry = mapping[slug];
      if (entry) hits.push({ slug, entry });
    }
    if (hits.length === 0) {
      report.skipped += 1;
      continue;
    }

    const taxonomyMissing =
      event.subcategoryLinks.length === 0 && (!event.subcategories || event.subcategories.length === 0);
    if (!taxonomyMissing && !force) {
      report.skipped += 1;
      continue;
    }

    const categories = new Set(
      hits.map((h) => h.entry.category).filter((c): c is EventCategory => c != null),
    );
    if (categories.size > 1) {
      report.conflicts.push({
        eventId: event.id,
        slug: event.slug,
        reason: 'multiple_category_targets',
        categories: [...categories],
      });
      continue;
    }

    const primary = hits[0]!;
    const targetCat = primary.entry.category;
    const subId = primary.entry.subcategoryId;

    if (targetCat != null && targetCat !== event.category) {
      report.conflicts.push({
        eventId: event.id,
        slug: event.slug,
        reason: 'category_mismatch',
        current: event.category,
        mapped: targetCat,
      });
      continue;
    }

    if (!subId && !targetCat) {
      report.skipped += 1;
      continue;
    }

    if (!apply) {
      report.wouldUpdate += 1;
      continue;
    }

    if (subId) {
      const sub = await prisma.subcategory.findUnique({ where: { id: subId } });
      if (!sub) {
        report.conflicts.push({
          eventId: event.id,
          reason: 'invalid_subcategoryId',
          subcategoryId: subId,
        });
        continue;
      }
      await prisma.eventSubcategoryLink.upsert({
        where: { eventId_subcategoryId: { eventId: event.id, subcategoryId: subId } },
        create: { eventId: event.id, subcategoryId: subId },
        update: {},
      });
    }

    report.applied += 1;
  }

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
