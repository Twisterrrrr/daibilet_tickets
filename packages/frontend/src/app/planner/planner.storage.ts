import type { PlannerDay, PlannerItem, PlannerState } from './planner.types';

function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object';
}

function isPlannerItem(x: unknown): x is PlannerItem {
  if (!isRecord(x)) return false;
  const kind = x.kind;
  if (kind !== 'event' && kind !== 'venue' && kind !== 'combo') return false;
  return typeof x.id === 'string' && typeof x.slug === 'string' && typeof x.title === 'string';
}

function isPlannerDay(x: unknown): x is PlannerDay {
  if (!isRecord(x)) return false;
  return typeof x.date === 'string' && Array.isArray(x.items) && x.items.every(isPlannerItem);
}

export function parsePlannerState(raw: unknown): PlannerState | null {
  if (!isRecord(raw)) return null;

  const daysRaw = raw.days;
  if (!Array.isArray(daysRaw) || !daysRaw.every(isPlannerDay)) return null;

  const cityRaw = raw.city;
  const city =
    isRecord(cityRaw) && typeof cityRaw.slug === 'string' && typeof cityRaw.name === 'string'
      ? { slug: cityRaw.slug, name: cityRaw.name }
      : undefined;

  return {
    days: daysRaw,
    city,
    currency: 'RUB',
    totals: { price: 0, items: 0, durationMin: 0 }, // редьюсер пересчитает
  };
}

