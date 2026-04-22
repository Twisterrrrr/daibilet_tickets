import fs from 'fs';
import path from 'path';

import type { BackfillError, BackfillReport, BackfillUnresolvedCase, SourceRecordRef } from './backfill-types';

function isoStampForFilename(d = new Date()) {
  // YYYY-MM-DDTHH-mm-ss
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

export function createBackfillReport<TUnresolved extends BackfillUnresolvedCase>(
  script: string,
  dryRun: boolean,
): BackfillReport<TUnresolved> {
  const startedAt = new Date().toISOString();
  return {
    startedAt,
    finishedAt: startedAt,
    dryRun,
    script,
    report: {
      scanned: 0,
      matched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      unresolvedCount: 0,
      errorCount: 0,
    },
    unresolved: [],
    errors: [],
    notes: [],
  };
}

export function pushUnresolved<TUnresolved extends BackfillUnresolvedCase>(rep: BackfillReport<TUnresolved>, item: TUnresolved) {
  rep.unresolved.push(item);
  rep.report.unresolvedCount = rep.unresolved.length;
}

export function pushError(rep: BackfillReport, err: { code: string; message: string; source_record_ref?: SourceRecordRef }) {
  const e: BackfillError = { code: err.code, message: err.message, source_record_ref: err.source_record_ref };
  rep.errors.push(e);
  rep.report.errorCount = rep.errors.length;
}

export function finalizeBackfillReport(rep: BackfillReport) {
  rep.finishedAt = new Date().toISOString();
  rep.report.unresolvedCount = rep.unresolved.length;
  rep.report.errorCount = rep.errors.length;
}

export function writeBackfillReportToFile(rep: BackfillReport) {
  const outDir = path.resolve(process.cwd(), '../../docs/reports');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = isoStampForFilename(new Date(rep.finishedAt));
  const suffix = rep.dryRun ? 'dry-run' : 'apply';
  const file = `${stamp}-${rep.script}-${suffix}.json`;
  const outPath = path.join(outDir, file);
  fs.writeFileSync(outPath, JSON.stringify(rep, null, 2), 'utf8');
  return outPath;
}

export function printBackfillSummary(rep: BackfillReport, reportFile: string) {
  // concise and consistent
  console.log(
    JSON.stringify({
      script: rep.script,
      dryRun: rep.dryRun,
      scanned: rep.report.scanned,
      matched: rep.report.matched,
      created: rep.report.created,
      updated: rep.report.updated,
      skipped: rep.report.skipped,
      unresolvedCount: rep.report.unresolvedCount,
      errorCount: rep.report.errorCount,
      reportFile,
    }),
  );
}
