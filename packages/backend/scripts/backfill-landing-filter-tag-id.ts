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

  const rep = createBackfillReport<Unresolved>('backfill-landing-filter-tag-id', cli.dryRun);
  rep.notes.push('Default: dry-run. Writes happen only with --apply.');

  try {    console.log(JSON.stringify({ script: rep.script, dryRun: cli.dryRun, apply: cli.apply }));

    const landings = await prisma.landingPage.findMany({
      where: { filterTagId: null, filterTag: { not: '' }, isDeleted: false },
      select: { id: true, filterTag: true },
      take: 100000,
    });

    rep.report.matched = landings.length;

    for (const l of landings) {
      rep.report.scanned += 1;

      const tag = await prisma.tag.findFirst({
        where: { slug: l.filterTag, isActive: true },
        select: { id: true, isDeleted: true },
      });

      if (!tag) {
        pushUnresolved(rep, {
          type: 'slug_not_found',
          message: 'LandingPage.filterTag slug was not resolved to Tag',
          source_record_ref: { entity: 'LandingPage', id: l.id },
          field: 'filterTag',
          legacy_value: l.filterTag,
          target_hint: { entity: 'Tag', slug: l.filterTag },
        });
        rep.report.unresolvedCount += 1;
        continue;
      }

      if (tag.isDeleted) {
        pushUnresolved(rep, {
          type: 'target_deleted',
          message: 'Tag target isDeleted=true',
          source_record_ref: { entity: 'LandingPage', id: l.id },
          field: 'filterTag',
          legacy_value: l.filterTag,
          target_hint: { entity: 'Tag', id: tag.id, slug: l.filterTag },
        });
        continue;
      }

      if (cli.apply) {
        await prisma.landingPage.update({ where: { id: l.id }, data: { filterTagId: tag.id } });
        rep.report.updated += 1;
      } else {
        rep.report.updated += 1;
      }

      if (rep.report.scanned % 500 === 0) {
        process.stdout.write(`scanned ${rep.report.scanned}/${landings.length}\n`);
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
