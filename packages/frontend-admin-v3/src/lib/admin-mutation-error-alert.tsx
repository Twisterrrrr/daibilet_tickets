import type { AdminErrorDisplay } from '@/lib/get-admin-error-message';

/**
 * Ошибка мутации в диалоге: stale-state — нейтрально-янтарный блок (не «красная паника»),
 * остальные доменные ошибки — розовый блок.
 */
export function AdminMutationErrorAlert({ display }: { display: AdminErrorDisplay | null }) {
  if (!display) return null;
  const isStale = display.code === 'VENUE_STALE_STATE';
  const boxClass = isStale
    ? 'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'
    : 'rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100';
  return (
    <div className={boxClass} role="alert">
      <div className="font-medium whitespace-pre-line">{display.title}</div>
      {display.description ? (
        <div className="mt-1 text-sm opacity-90 whitespace-pre-line">{display.description}</div>
      ) : null}
    </div>
  );
}
