export type SourceRecordRef = Record<string, string | number | null>;

export type BackfillUnresolvedCase = {
  type: string;
  message: string;
  source_record_ref: SourceRecordRef;
  field?: string;
  legacy_value?: string | number | null;
  target_hint?: Record<string, string | number | null>;
};

export type BackfillError = {
  code: string;
  message: string;
  source_record_ref?: SourceRecordRef;
};

export type BackfillReport<TUnresolved extends BackfillUnresolvedCase = BackfillUnresolvedCase> = {
  startedAt: string;
  finishedAt: string;
  dryRun: boolean;
  script: string;
  report: {
    scanned: number;
    matched: number;
    created: number;
    updated: number;
    skipped: number;
    unresolvedCount: number;
    errorCount: number;
  };
  unresolved: TUnresolved[];
  errors: BackfillError[];
  notes: string[];
};
