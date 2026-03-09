/**
 * Session UX: scarcity labels, price hint, recommendations.
 * Используется на frontend и backend.
 */

export type ScarcityLevel = 'NONE' | 'LOW' | 'LAST' | 'SOLD_OUT';

export interface ScarcityState {
  level: ScarcityLevel;
  label: string | null;
}

/** Вычисляет scarcity по доступному числу мест */
export function getScarcityState(available: number | null | undefined): ScarcityState {
  if (available == null) return { level: 'NONE', label: null };
  const n = Number(available);
  if (!Number.isFinite(n) || n < 0) return { level: 'NONE', label: null };
  if (n <= 0) return { level: 'SOLD_OUT', label: 'Распродано' };
  if (n <= 3) return { level: 'LAST', label: `Последние места (${n})` };
  if (n < 10) return { level: 'LOW', label: `Осталось всего ${n} мест` };
  return { level: 'NONE', label: null };
}
