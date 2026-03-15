export type FinanceHistoryItem = {
  status: string;
  changedAt: string;
  changedByUserId: string | null;
  changedByRole: 'ADMIN' | 'SUPPLIER';
  comment: string | null;
};

export type FinanceMetaJson = {
  history?: FinanceHistoryItem[];
  disputeStatus?: string;
  disputeId?: string;
  [key: string]: unknown;
};

