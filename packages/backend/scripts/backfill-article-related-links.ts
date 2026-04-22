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

  const rep = createBackfillReport<Unresolved>('backfill-article-related-links', cli.dryRun);
  rep.notes.push('Default: dry-run. Writes happen only with --apply.');

  try {
    const forceMerge = cli.flags.has('--force-merge');
    if (forceMerge) rep.notes.push('forceMerge enabled: will backfill even if link-tables already have data.');

    // stdout guard-rail    console.log(JSON.stringify({ script: rep.script, dryRun: cli.dryRun, apply: cli.apply }));

    const articles = await prisma.article.findMany({
      where: {
        OR: [{ relatedLandingIds: { isEmpty: false } }, { relatedCollectionIds: { isEmpty: false } }],
      },
      select: {
        id: true,
        relatedLandingIds: true,
        relatedCollectionIds: true,
        landingLinks: { select: { landingId: true } },
        collectionLinks: { select: { collectionId: true } },
      },
      take: 100000,
    });

    for (const a of articles) {
      rep.report.scanned += 1;
      rep.report.matched += 1;

      const hasLandingLinks = a.landingLinks.length > 0;
      const hasCollectionLinks = a.collectionLinks.length > 0;

      if (!forceMerge && (hasLandingLinks || hasCollectionLinks)) {
        rep.report.skipped += 1;
        continue;
      }

      if (a.relatedLandingIds.length > 0) {
        const landingRows = await prisma.landingPage.findMany({
          where: { id: { in: a.relatedLandingIds } },
          select: { id: true, isDeleted: true },
        });
        const byId = new Map(landingRows.map((r) => [r.id, r] as const));

        for (const legacyId of a.relatedLandingIds) {
          const row = byId.get(legacyId);
          if (!row) {
            pushUnresolved(rep, {
              type: 'legacy_id_not_found',
              message: 'Article.relatedLandingIds id was not resolved to LandingPage',
              source_record_ref: { entity: 'Article', id: a.id },
              field: 'relatedLandingIds',
              legacy_value: legacyId,
              target_hint: { entity: 'LandingPage', id: legacyId },
            });
          } else if (row.isDeleted) {
            pushUnresolved(rep, {
              type: 'target_deleted',
              message: 'LandingPage target isDeleted=true',
              source_record_ref: { entity: 'Article', id: a.id },
              field: 'relatedLandingIds',
              legacy_value: legacyId,
              target_hint: { entity: 'LandingPage', id: legacyId },
            });
          }
        }

        const links = a.relatedLandingIds
          .filter((id) => byId.has(id) && !byId.get(id)!.isDeleted)
          .map((landingId, idx) => ({ articleId: a.id, landingId, position: idx, priority: 0 }));

        if (links.length > 0) {
          if (cli.apply) {
            await prisma.articleLandingLink.createMany({ data: links, skipDuplicates: true });
          }
          rep.report.created += links.length;
        }
      }

      if (a.relatedCollectionIds.length > 0) {
        const collectionRows = await prisma.collection.findMany({
          where: { id: { in: a.relatedCollectionIds } },
          select: { id: true, isDeleted: true },
        });
        const byId = new Map(collectionRows.map((r) => [r.id, r] as const));

        for (const legacyId of a.relatedCollectionIds) {
          const row = byId.get(legacyId);
          if (!row) {
            pushUnresolved(rep, {
              type: 'legacy_id_not_found',
              message: 'Article.relatedCollectionIds id was not resolved to Collection',
              source_record_ref: { entity: 'Article', id: a.id },
              field: 'relatedCollectionIds',
              legacy_value: legacyId,
              target_hint: { entity: 'Collection', id: legacyId },
            });
          } else if (row.isDeleted) {
            pushUnresolved(rep, {
              type: 'target_deleted',
              message: 'Collection target isDeleted=true',
              source_record_ref: { entity: 'Article', id: a.id },
              field: 'relatedCollectionIds',
              legacy_value: legacyId,
              target_hint: { entity: 'Collection', id: legacyId },
            });
          }
        }

        const links = a.relatedCollectionIds
          .filter((id) => byId.has(id) && !byId.get(id)!.isDeleted)
          .map((collectionId, idx) => ({ articleId: a.id, collectionId, position: idx, priority: 0 }));

        if (links.length > 0) {
          if (cli.apply) {
            await prisma.articleCollectionLink.createMany({ data: links, skipDuplicates: true });
          }
          rep.report.created += links.length;
        }
      }

      if (rep.report.scanned % 500 === 0) {
        process.stdout.write(`scanned ${rep.report.scanned}/${articles.length}\n`);
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
