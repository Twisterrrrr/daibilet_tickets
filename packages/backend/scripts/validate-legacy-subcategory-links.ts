/**
 * Read-only: сверка legacy `events.subcategories` (enum[]) с фактическими `EventSubcategoryLink` → `Subcategory.code`.
 * Инвариант для выхода на links-only: множества кодов должны совпадать (порядок не важен).
 *
 * Запуск из `packages/backend`:
 *   `pnpm run data:validate-legacy-subcategory-links`
 *   `pnpm run data:validate-legacy-subcategory-links -- --report=./tmp/validate-subcat-links.json`
 *   `pnpm run data:validate-legacy-subcategory-links -- --limit=500`
 *   `pnpm run data:validate-legacy-subcategory-links -- --eventId=...`
 *   `pnpm run data:validate-legacy-subcategory-links -- --slugContains=fixture-`
 *   `pnpm run data:validate-legacy-subcategory-links -- --updatedAfter=2026-04-01T00:00:00Z`
 */
import { config as dotenvConfig } from 'dotenv';
import * as fs from 'fs';
import path from 'path';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { EventSubcategory, PrismaClient } from '../src/generated/prisma/client';

dotenvConfig({ path: path.resolve(process.cwd(), '../../.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const VALID_ENUM = new Set<string>(Object.values(EventSubcategory));

type CliArgs = {
  reportPath: string | null;
  limit: number | null;
  eventId: string | null;
  slugContains: string | null;
  updatedAfter: Date | null;
};

function parseCliArgs(): CliArgs {
  const args = process.argv.slice(2);

  const getString = (key: string): string | null => {
    const arg = args.find((a) => a.startsWith(`--${key}=`));
    if (!arg) return null;
    const v = arg.slice(key.length + 3).trim();
    return v.length > 0 ? v : null;
  };

  const reportRaw = getString('report');
  const limitRaw = getString('limit');
  const eventId = getString('eventId');
  const slugContains = getString('slugContains');
  const updatedAfterRaw = getString('updatedAfter');

  const reportPath = reportRaw ?? null;

  let limit: number | null = null;
  if (limitRaw) {
    const n = Number.parseInt(limitRaw, 10);
    if (Number.isFinite(n) && n > 0) limit = n;
  }

  let updatedAfter: Date | null = null;
  if (updatedAfterRaw) {
    const d = new Date(updatedAfterRaw);
    if (!Number.isNaN(d.getTime())) updatedAfter = d;
  }

  return {
    reportPath,
    limit,
    eventId,
    slugContains,
    updatedAfter,
  };
}

function normalizeLegacy(raw: unknown): { codes: string[]; invalid: string[] } {
  const arr = Array.isArray(raw) ? raw : [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    if (x == null || x === '') continue;
    const s = String(x);
    if (!VALID_ENUM.has(s)) {
      invalid.push(s);
      continue;
    }
    seen.add(s);
  }
  return { codes: [...seen].sort(), invalid: [...new Set(invalid)].sort() };
}

function normalizeLinkCodes(
  links: Array<{ subcategory: { code: string } }>,
): string[] {
  const seen = new Set<string>();
  for (const l of links) {
    const c = l.subcategory?.code;
    if (c) seen.add(c);
  }
  return [...seen].sort();
}

function diffSets(a: string[], b: string[]) {
  const setB = new Set(b);
  const setA = new Set(a);
  const onlyA = a.filter((x) => !setB.has(x));
  const onlyB = b.filter((x) => !setA.has(x));
  return { onlyLegacy: onlyA, onlyLinks: onlyB };
}

async function main() {
  const { reportPath, limit, eventId, slugContains, updatedAfter } = parseCliArgs();

  const baseWhere: Record<string, unknown> = {
    isDeleted: false,
    OR: [
      { NOT: { subcategories: { equals: [] } } },
      { subcategoryLinks: { some: {} } },
    ],
  };

  if (eventId) {
    (baseWhere as any).id = eventId;
  }
  if (slugContains) {
    (baseWhere as any).slug = { contains: slugContains, mode: 'insensitive' };
  }
  if (updatedAfter) {
    (baseWhere as any).updatedAt = { gt: updatedAfter };
  }

  let ok = 0;
  let mismatch = 0;
  let eventsWithInvalidLegacyEnum = 0;
  let totalScanned = 0;
  let legacyOnlyEvents = 0;
  let linksOnlyEvents = 0;

  const mismatches: Array<{
    eventId: string;
    slug: string | null;
    legacyCodes: string[];
    linkCodes: string[];
    onlyLegacy: string[];
    onlyLinks: string[];
    invalidLegacyValues: string[];
  }> = [];

  const batchSize = limit && limit < 500 ? limit : 500;
  let remaining = limit ?? Number.POSITIVE_INFINITY;
  let cursor: { id: string } | undefined;

  // cursor-based проход по всей выборке
  // сортировка по id даёт стабильный порядок и совместима с cursor
  for (;;) {
    if (remaining <= 0) break;

    const take = Math.min(batchSize, remaining);

    const events = await prisma.event.findMany({
      where: baseWhere,
      select: {
        id: true,
        slug: true,
        subcategories: true,
        subcategoryLinks: {
          select: {
            subcategory: { select: { code: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
      ...(cursor ? { cursor, skip: 1 } : {}),
      take,
    });

    if (events.length === 0) break;

    for (const ev of events) {
      totalScanned += 1;
      const { codes: legacyCodes, invalid } = normalizeLegacy(ev.subcategories);
      const linkCodes = normalizeLinkCodes(ev.subcategoryLinks ?? []);

      const legacyOk = invalid.length === 0;
      const setsOk =
        legacyCodes.length === linkCodes.length &&
        legacyCodes.every((c, i) => c === linkCodes[i]);

      if (!legacyOk) eventsWithInvalidLegacyEnum += 1;

      const { onlyLegacy, onlyLinks } = diffSets(legacyCodes, linkCodes);
      if (onlyLegacy.length > 0 && onlyLinks.length === 0) {
        legacyOnlyEvents += 1;
      }
      if (onlyLinks.length > 0 && onlyLegacy.length === 0) {
        linksOnlyEvents += 1;
      }

      if (legacyOk && setsOk) {
        ok += 1;
      } else {
        mismatch += 1;
        mismatches.push({
          eventId: ev.id,
          slug: ev.slug,
          legacyCodes,
          linkCodes,
          onlyLegacy,
          onlyLinks,
          invalidLegacyValues: invalid,
        });
      }
    }

    remaining -= events.length;
    cursor = { id: events[events.length - 1]?.id };
    if (!cursor?.id) break;
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    eventsChecked: totalScanned,
    ok,
    mismatch,
    eventsWithInvalidLegacyEnum,
    legacyOnlyEvents,
    linksOnlyEvents,
  };

  // Человекочитаемый summary
  console.log(
    [
      'Legacy subcategories vs links validation:',
      `  eventsChecked=${summary.eventsChecked}`,
      `  ok=${summary.ok}`,
      `  mismatch=${summary.mismatch}`,
      `  eventsWithInvalidLegacyEnum=${summary.eventsWithInvalidLegacyEnum}`,
      `  legacyOnlyEvents=${summary.legacyOnlyEvents}`,
      `  linksOnlyEvents=${summary.linksOnlyEvents}`,
    ].join('\n'),
  );
  // JSON для машинного парсинга (CI/артефакт)
  console.log(JSON.stringify(summary, null, 2));
  if (mismatches.length) {
    console.warn(
      `mismatches (first 40): ${mismatches.length} total`,
      mismatches.slice(0, 40),
    );
  }

  if (reportPath) {
    const abs = path.isAbsolute(reportPath) ? reportPath : path.resolve(process.cwd(), reportPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(
      abs,
      JSON.stringify({ ...summary, mismatches }, null, 2),
      'utf8',
    );
    console.log(`report written: ${abs}`);
  }

  const failed = mismatch > 0;
  if (failed) {
    console.error('VALIDATION FAILED: legacy subcategories and links differ (see mismatches).');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
