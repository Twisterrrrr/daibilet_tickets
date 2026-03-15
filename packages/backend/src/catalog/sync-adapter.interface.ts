/**
 * Extension point для источников каталога (Phase 8).
 * TcSyncService.syncAll() и TepSyncService.syncAll() соответствуют контракту.
 */
export interface SyncResult {
  status: string;
  eventsProcessed?: number;
  errors?: string[];
  [key: string]: unknown;
}

export interface SyncAdapter {
  readonly id: string;
  readonly name: string;
  syncAll(): Promise<SyncResult>;
}
