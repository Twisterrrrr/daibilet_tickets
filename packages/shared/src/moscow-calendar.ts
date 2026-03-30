/**
 * Календарный день в Europe/Moscow как YYYY-MM-DD.
 * Нужен для фильтров лендингов: чипы дат и строки таблицы должны совпадать с локальным днём сеанса.
 */
const MSK = 'Europe/Moscow';

export function moscowCalendarDayFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: MSK });
}

/** Любой момент времени → календарный день в Москве (YYYY-MM-DD) */
export function dateToMoscowISO(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MSK,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function getMoscowTodayISO(now: Date = new Date()): string {
  return dateToMoscowISO(now);
}

/** +24 ч к моменту (UTC-линейно), затем день по MSK — одинаково в любом окружении */
export function getMoscowTomorrowISO(now: Date = new Date()): string {
  return dateToMoscowISO(new Date(now.getTime() + 86_400_000));
}
