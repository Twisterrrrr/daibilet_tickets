/**
 * Создаёт EventSubcategoryLink из legacy enum `events.subcategories`, если связей ещё нет.
 * Карта enum → slug совпадает с SubcategoryPolicyService (packages/backend).
 *
 * packages/backend:
 *   `pnpm data:backfill-legacy-subcategory-links` — dry-run
 *   `pnpm data:backfill-legacy-subcategory-links --apply`
 *   `pnpm data:backfill-legacy-subcategory-links --apply --report=./tmp/subcat-backfill.json`
 */
import { config as dotenvConfig } from 'dotenv';
import * as fs from 'fs';
import path from 'path';

import { EventSubcategory, PrismaClient } from '@prisma/client';

dotenvConfig({ path: path.resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

const LEGACY_TO_SLUG: Partial<Record<EventSubcategory, string>> = {
  RIVER: 'river-excursion',
  WALKING: 'walking-excursion',
  BUS: 'bus-excursion',
  COMBINED: 'combined-excursion',
  QUEST: 'quest-excursion',
  GASTRO: 'gastro-excursion',
  ROOFTOP: 'rooftop',
  EXTREME: 'extreme',
  MUSEUM_CLASSIC: 'museum',
  EXHIBITION: 'exhibition',
  GALLERY: 'gallery',
  PALACE: 'palace-estate',
  PARK: 'park-reserve',
  ART_SPACE: 'art-space',
  CONCERT: 'concert',
  SHOW: 'show',
  STANDUP: 'standup',
  THEATER: 'theater',
  SPORT: 'sport',
  FESTIVAL: 'festival',
  MASTERCLASS: 'masterclass',
  PARTY: 'party',
};

const MAX_LINKS = 3;

function parseReportPath(): string | null {
  const arg = process.argv.find((a) => a.startsWith('--report='));
  if (!arg) return null;
  const p = arg.slice('--report='.length).trim();
  return p.length > 0 ? p : null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const reportPath = parseReportPath();

  const [subcats, events, skippedExisting] = await Promise.all([
    prisma.subcategory.findMany({
      where: { isActive: true },
      select: { id: true, slug: true },
    }),
    prisma.event.findMany({
      where: {
        isDeleted: false,
        subcategoryLinks: { none: {} },
        NOT: { subcategories: { equals: [] } },
      },
      select: { id: true, subcategories: true },
    }),
    prisma.event.count({
      where: {
        isDeleted: false,
        subcategoryLinks: { some: {} },
        NOT: { subcategories: { equals: [] } },
      },
    }),
  ]);

  const slugToId = new Map(subcats.map((s) => [s.slug, s.id]));

  const unmapped: string[] = [];
  let linked = 0;
  let eventsLinked = 0;
  let skippedUnmappedEvents = 0;
  const eventDetails: { eventId: string; linkCount: number; subcategoryIds: string[] }[] = [];

  for (const ev of events) {
    const enums = (ev.subcategories ?? []).filter(Boolean) as EventSubcategory[];
    const subIds: string[] = [];
    for (const e of enums) {
      const slug = LEGACY_TO_SLUG[e];
      if (!slug) {
        unmapped.push(`${ev.id}:${e}`);
        continue;
      }
      const id = slugToId.get(slug);
      if (!id) {
        unmapped.push(`${ev.id}:${e}->${slug}`);
        continue;
      }
      if (!subIds.includes(id)) subIds.push(id);
    }
    const take = subIds.slice(0, MAX_LINKS);
    if (take.length === 0) {
      if (enums.length > 0) skippedUnmappedEvents += 1;
      continue;
    }

    linked += take.length;
    eventsLinked += 1;
    eventDetails.push({ eventId: ev.id, linkCount: take.length, subcategoryIds: take });

    if (apply) {
      await prisma.eventSubcategoryLink.createMany({
        data: take.map((subcategoryId) => ({ eventId: ev.id, subcategoryId })),
        skipDuplicates: true,
      });
    } else if (events.length <= 30) {
      console.log(`  ${ev.id}: +${take.length} link(s)`);
    }
  }

  const processed = events.length;
  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? ('apply' as const) : ('dry-run' as const),
    processed,
    linked,
    events_linked: eventsLinked,
    skipped_unmapped: unmapped.length,
    skipped_unmapped_events: skippedUnmappedEvents,
    skipped_existing_with_links: skippedExisting,
    unmapped,
  };

  console.log(`processed: ${processed}`);
  console.log(`linked: ${linked} (${eventsLinked} events)`);
  console.log(`skipped_unmapped: ${unmapped.length} (entries), skipped_unmapped_events: ${skippedUnmappedEvents}`);
  console.log(`skipped_existing_with_links (not in this run): ${skippedExisting}`);
  if (unmapped.length) {
    console.warn('unmapped (first 50):', unmapped.slice(0, 50), unmapped.length > 50 ? '…' : '');
  }

  if (reportPath) {
    const abs = path.isAbsolute(reportPath) ? reportPath : path.resolve(process.cwd(), reportPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const reportWithDetails = { ...report, event_details: eventDetails };
    fs.writeFileSync(abs, JSON.stringify(reportWithDetails, null, 2), 'utf8');
    console.log(`report written: ${abs}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());