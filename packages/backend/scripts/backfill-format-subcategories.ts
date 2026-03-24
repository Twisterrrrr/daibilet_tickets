import { config as dotenvConfig } from 'dotenv';
import path from 'path';

import { PrismaClient, StructuralTagGroup } from '@prisma/client';

dotenvConfig({ path: path.resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

const FORMAT_TO_SUBCATEGORY_SLUG: Record<string, string> = {
  walking: 'walking-excursion',
  bus: 'bus-excursion',
  boat: 'river-excursion',
  guided: 'walking-excursion',
  audio: 'museum',
  immersive: 'show',
  theatrical: 'theater',
  open_date: 'museum',
  combo: 'combined-excursion',
  skip_the_line: 'museum',
};

type Candidate = {
  eventId: string;
  tagCode: string;
  tagSlug: string;
  mappedSubcategorySlug: string;
};

function parseApplyFlag(): boolean {
  return process.argv.includes('--apply');
}

function normalizeKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

async function main() {
  const apply = parseApplyFlag();
  const mode = apply ? 'APPLY' : 'DRY_RUN';

  const subcategories = await prisma.subcategory.findMany({
    where: { slug: { in: Object.values(FORMAT_TO_SUBCATEGORY_SLUG) } },
    select: { id: true, slug: true },
  });
  const subcategoryBySlug = new Map(subcategories.map((s) => [s.slug, s.id]));

  const eventTags = await prisma.eventTag.findMany({
    where: {
      tag: {
        tagKind: 'STRUCTURAL',
        structuralGroup: StructuralTagGroup.FORMAT,
      },
    },
    select: {
      eventId: true,
      tag: { select: { code: true, slug: true } },
    },
  });

  const candidates: Candidate[] = [];
  const unmapped: Record<string, number> = {};

  for (const row of eventTags) {
    const key = normalizeKey(row.tag.code) || normalizeKey(row.tag.slug);
    const mappedSlug = FORMAT_TO_SUBCATEGORY_SLUG[key];
    if (!mappedSlug) {
      unmapped[key || '(empty)'] = (unmapped[key || '(empty)'] ?? 0) + 1;
      continue;
    }
    candidates.push({
      eventId: row.eventId,
      tagCode: row.tag.code ?? '',
      tagSlug: row.tag.slug,
      mappedSubcategorySlug: mappedSlug,
    });
  }

  // Дедупликация пары (eventId + mappedSlug)
  const uniquePairs = new Map<string, Candidate>();
  for (const c of candidates) {
    uniquePairs.set(`${c.eventId}:${c.mappedSubcategorySlug}`, c);
  }
  const uniqueCandidates = Array.from(uniquePairs.values());

  const existingLinks = await prisma.eventSubcategoryLink.findMany({
    where: { eventId: { in: uniqueCandidates.map((c) => c.eventId) } },
    select: { eventId: true, subcategory: { select: { slug: true } } },
  });
  const existingSet = new Set(existingLinks.map((l) => `${l.eventId}:${l.subcategory.slug}`));

  const eventLinkCounts = new Map<string, number>();
  for (const link of existingLinks) {
    eventLinkCounts.set(link.eventId, (eventLinkCounts.get(link.eventId) ?? 0) + 1);
  }

  const toInsert: Array<{ eventId: string; subcategoryId: string }> = [];
  let skippedByLimit = 0;
  let skippedMissingSubcategory = 0;

  for (const c of uniqueCandidates) {
    if (existingSet.has(`${c.eventId}:${c.mappedSubcategorySlug}`)) continue;
    const subcategoryId = subcategoryBySlug.get(c.mappedSubcategorySlug);
    if (!subcategoryId) {
      skippedMissingSubcategory += 1;
      continue;
    }
    const currentCount = eventLinkCounts.get(c.eventId) ?? 0;
    if (currentCount >= 5) {
      skippedByLimit += 1;
      continue;
    }
    toInsert.push({ eventId: c.eventId, subcategoryId });
    eventLinkCounts.set(c.eventId, currentCount + 1);
    existingSet.add(`${c.eventId}:${c.mappedSubcategorySlug}`);
  }

  if (apply && toInsert.length > 0) {
    await prisma.eventSubcategoryLink.createMany({
      data: toInsert,
      skipDuplicates: true,
    });
  }

  const topUnmapped = Object.entries(unmapped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  console.log('=== backfill-format-subcategories ===');
  console.log(`Mode: ${mode}`);
  console.log(`FORMAT event tags scanned: ${eventTags.length}`);
  console.log(`Mapped candidates: ${uniqueCandidates.length}`);
  console.log(`Will insert links: ${toInsert.length}`);
  console.log(`Skipped (event limit 5): ${skippedByLimit}`);
  console.log(`Skipped (missing mapped subcategory): ${skippedMissingSubcategory}`);
  console.log(`Unmapped FORMAT keys: ${Object.keys(unmapped).length}`);
  if (topUnmapped.length > 0) {
    console.log('Top unmapped keys:');
    for (const [key, count] of topUnmapped) {
      console.log(`  - ${key}: ${count}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('backfill-format-subcategories error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
