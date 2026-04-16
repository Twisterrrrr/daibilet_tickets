import { config as dotenvConfig } from 'dotenv';
import path from 'path';

import { createScriptPrismaClient } from './_prisma';
import { parseBackfillCli } from './lib/backfill-cli';
import type { BackfillUnresolvedCase } from './lib/backfill-types';
import {
  createBackfillReport,
  finalizeBackfillReport,
  printBackfillSummary,
  pushError,
  pushUnresolved,
  writeBackfillReportToFile,
} from './lib/backfill-report';

dotenvConfig({ path: path.resolve(process.cwd(), '../../.env') });

type Unresolved = BackfillUnresolvedCase;

async function main() {
  const cli = parseBackfillCli();
  const { prisma, pool } = createScriptPrismaClient();

  const rep = createBackfillReport<Unresolved>('backfill-collection-tag-filters', cli.dryRun);
  rep.notes.push('Default: dry-run. Writes happen only with --apply.');

  try {
    const forceMerge = cli.flags.has('--force-merge');
    if (forceMerge) rep.notes.push('forceMerge enabled: will backfill even if tagFilters already have data.');    console.log(JSON.stringify({ script: rep.script, dryRun: cli.dryRun, apply: cli.apply, forceMerge }));

    const cols = await prisma.collection.findMany({
      where: { filterTags: { isEmpty: false }, isDeleted: false },
      select: {
        id: true,
        slug: true,
        filterTags: true,
        tagFilters: { select: { tagId: true } },
      },
      take: 100000,
    });

    rep.report.matched = cols.length;

    for (const c of cols) {
      rep.report.scanned += 1;

      if (!forceMerge && c.tagFilters.length > 0) {
        rep.report.skipped += 1;
        continue;
      }

      const tags = await prisma.tag.findMany({
        where: { slug: { in: c.filterTags }, isActive: true },
        select: { id: true, slug: true, isDeleted: true },
      });
      const bySlug = new Map(tags.map((t) => [t.slug, t] as const));

      for (const legacySlug of c.filterTags) {
        const t = bySlug.get(legacySlug);
        if (!t) {
          pushUnresolved(rep, {
            type: 'slug_not_found',
            message: 'Collection.filterTags slug was not resolved to Tag',
            source_record_ref: { entity: 'Collection', id: c.id },
            field: 'filterTags',
            legacy_value: legacySlug,
            target_hint: { entity: 'Tag', slug: legacySlug },
          });
        } else if (t.isDeleted) {
          pushUnresolved(rep, {
            type: 'target_deleted',
            message: 'Tag target isDeleted=true',
            source_record_ref: { entity: 'Collection', id: c.id },
            field: 'filterTags',
            legacy_value: legacySlug,
            target_hint: { entity: 'Tag', id: t.id, slug: legacySlug },
          });
        }
      }

      const rows = c.filterTags
        .map((slug, idx) => ({ slug, idx, t: bySlug.get(slug) ?? null }))
        .filter((x) => x.t && !x.t.isDeleted)
        .map((x) => ({ collectionId: c.id, tagId: x.t!.id, position: x.idx, priority: 0 }));

      if (rows.length === 0) {
        pushUnresolved(rep, {
          type: 'no_resolved_tags',
          message: 'No valid Tag targets resolved for Collection.filterTags',
          source_record_ref: { entity: 'Collection', id: c.id },
          field: 'filterTags',
          legacy_value: c.filterTags.join(','),
        });
        continue;
      }

      if (cli.apply) {
        if (forceMerge) {
          await prisma.collectionTagFilter.deleteMany({ where: { collectionId: c.id } });
        }
        await prisma.collectionTagFilter.createMany({ data: rows, skipDuplicates: true });
      }

      rep.report.created += rows.length;

      if (rep.report.scanned % 500 === 0) {
        process.stdout.write(`scanned ${rep.report.scanned}/${cols.length}\n`);
      }
    }
  } catch (e) {
    const err = e as { message?: string };
    pushError(rep, { code: 'UNHANDLED', message: err?.message ?? String(e) });    console.error(e);
    process.exitCode = 1;
  } finally {
    finalizeBackfillReport(rep);
    const reportFile = writeBackfillReportToFile(rep);
    printBackfillSummary(rep, reportFile);
    await prisma.$disconnect();
    await pool.end();
  }
}

void main();
