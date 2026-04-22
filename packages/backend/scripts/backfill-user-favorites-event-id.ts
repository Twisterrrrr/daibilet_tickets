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

  const rep = createBackfillReport<Unresolved>('backfill-user-favorites-event-id', cli.dryRun);
  rep.notes.push('Default: dry-run. Writes happen only with --apply.');

  try {    console.log(JSON.stringify({ script: rep.script, dryRun: cli.dryRun, apply: cli.apply }));

    const favs = await prisma.userFavorite.findMany({
      where: { eventId: null },
      select: { id: true, userId: true, eventSlug: true },
      take: 200000,
    });

    rep.report.matched = favs.length;

    for (const f of favs) {
      rep.report.scanned += 1;

      const e = await prisma.event.findUnique({ where: { slug: f.eventSlug }, select: { id: true, isDeleted: true } });
      if (!e) {
        pushUnresolved(rep, {
          type: 'orphan_favorite',
          message: 'UserFavorite.eventSlug was not resolved to Event',
          source_record_ref: { entity: 'UserFavorite', id: f.id, userId: f.userId },
          field: 'eventSlug',
          legacy_value: f.eventSlug,
          target_hint: { entity: 'Event', slug: f.eventSlug },
        });
        continue;
      }
      if (e.isDeleted) {
        pushUnresolved(rep, {
          type: 'target_deleted',
          message: 'Event target isDeleted=true',
          source_record_ref: { entity: 'UserFavorite', id: f.id, userId: f.userId },
          field: 'eventSlug',
          legacy_value: f.eventSlug,
          target_hint: { entity: 'Event', id: e.id, slug: f.eventSlug },
        });
        continue;
      }

      if (cli.apply) {
        await prisma.userFavorite.update({ where: { id: f.id }, data: { eventId: e.id } });
      }
      rep.report.updated += 1;

      if (rep.report.scanned % 1000 === 0) {
        process.stdout.write(`scanned ${rep.report.scanned}/${favs.length}\n`);
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
