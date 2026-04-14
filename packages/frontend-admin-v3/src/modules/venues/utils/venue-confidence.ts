export type VenueConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

/**
 * Мета для UI: пороги HIGH ≥ 0.85, MEDIUM ≥ 0.60, LOW ниже 0.60, NONE при отсутствии score (не маскировать под LOW).
 */
export function getConfidenceMeta(score: number | null | undefined): {
  level: ConfidenceLevel;
  label: string;
  percent: string | null;
} {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return { level: 'NONE', label: '—', percent: null };
  }
  const s = Number(score);
  const pct = `${Math.round(s * 100)}%`;
  if (s >= 0.85) return { level: 'HIGH', label: 'High', percent: pct };
  if (s >= 0.6) return { level: 'MEDIUM', label: 'Medium', percent: pct };
  return { level: 'LOW', label: 'Low', percent: pct };
}

/**
 * Уровень уверенности импорта (0…1). null — нет оценки.
 * HIGH ≥ 0.85, MEDIUM ≥ 0.60, иначе LOW.
 */
export function getVenueConfidenceBand(score: number | null | undefined): VenueConfidenceBand | null {
  const m = getConfidenceMeta(score);
  if (m.level === 'NONE') return null;
  return m.level;
}

export function formatConfidencePercent(score: number | null | undefined): string | null {
  const m = getConfidenceMeta(score);
  return m.percent;
}
