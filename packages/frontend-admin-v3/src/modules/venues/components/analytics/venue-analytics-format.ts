/** Форматирование долей 0..1 для UI. */
export function formatSharePct(x: number, fractionDigits = 1): string {
  if (!Number.isFinite(x)) return '—';
  return `${(x * 100).toFixed(fractionDigits)}%`;
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} мс`;
  return `${(ms / 1000).toFixed(1)} с`;
}
