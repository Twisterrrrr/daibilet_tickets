import type { ReactNode } from 'react';
import { clsx } from 'clsx';

import { EmptyState } from '../states/EmptyState';
import { ErrorState } from '../states/ErrorState';
import { LoadingState } from '../states/LoadingState';

export interface DataTableShellProps {
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  className?: string;
  loadingLabel?: string;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  errorTitle?: ReactNode;
  errorDescription?: ReactNode;
  errorAction?: ReactNode;
  toolbar?: ReactNode;
  pagination?: ReactNode;
}

export function DataTableShell({
  children,
  loading = false,
  error = null,
  isEmpty = false,
  className,
  loadingLabel,
  emptyTitle,
  emptyDescription,
  errorTitle,
  errorDescription,
  errorAction,
  toolbar,
  pagination,
}: DataTableShellProps) {
  return (
    <section className={clsx('space-y-3', className)}>
      {toolbar ? <div>{toolbar}</div> : null}
      {loading ? <LoadingState label={loadingLabel} className="rounded-xl border" /> : null}
      {!loading && error ? (
        <ErrorState title={errorTitle} description={errorDescription ?? error} action={errorAction} />
      ) : null}
      {!loading && !error && isEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} className="rounded-xl" />
      ) : null}
      {!loading && !error && !isEmpty ? children : null}
      {!loading && !error && !isEmpty && pagination ? <div>{pagination}</div> : null}
    </section>
  );
}

