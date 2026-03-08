/**
 * Нормализация периодов показа промо-блоков.
 * startsAt = начало дня (00:00:00 UTC)
 * endsAt = конец дня (23:59:59.999 UTC)
 * Устраняет баг: "заканчивается 10 марта" при хранении как 00:00 UTC — блок исчезал в начале дня.
 */
export function normalizePromoPeriod(
  startsAtInput?: string | Date | null,
  endsAtInput?: string | Date | null,
): { startsAt: Date | null; endsAt: Date | null } {
  const startsAt = parseDateForPromo(startsAtInput, 'start');
  const endsAt = parseDateForPromo(endsAtInput, 'end');
  return { startsAt, endsAt };
}

function isDateOnlyString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function parseDateForPromo(
  input: string | Date | null | undefined,
  mode: 'start' | 'end',
): Date | null {
  if (input == null || (typeof input === 'string' && !input.trim())) return null;

  const date = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(date.getTime())) return null;

  const asStr = typeof input === 'string' ? input.trim() : input.toISOString().slice(0, 10);
  if (typeof input === 'string' && isDateOnlyString(asStr)) {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    const d = date.getUTCDate();
    if (mode === 'start') {
      return new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    }
    return new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
  }
  return date;
}
