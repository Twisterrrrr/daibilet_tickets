/**
 * Календарный день в часовом поясе города (IANA) как YYYY-MM-DD.
 * Логика «сегодня»/«завтра» опирается на выбранный timezone, а не на TZ окружения.
 * По умолчанию — Europe/Moscow (обратная совместимость с прежними именами).
 */

/** Таймзона по умолчанию и для алиасов *Moscow* */
export const DEFAULT_CALENDAR_TZ = 'Europe/Moscow';

/**
 * Маппинг slug города Дайбилета → IANA (см. city-landing-enhancer CITY_TIMEZONES;
 * для СПб используется slug `saint-petersburg`).
 */
export const CITY_TIMEZONES: Record<string, string> = {
  moscow: 'Europe/Moscow',
  'saint-petersburg': 'Europe/Moscow',
  spb: 'Europe/Moscow',
  kazan: 'Europe/Moscow',
  'nizhny-novgorod': 'Europe/Moscow',
  yaroslavl: 'Europe/Moscow',
  tver: 'Europe/Moscow',
  volgograd: 'Europe/Volgograd',
  samara: 'Europe/Samara',
  perm: 'Asia/Yekaterinburg',
  'rostov-on-don': 'Europe/Moscow',
  /** Канонический slug города в каталоге Дайбилета */
  'rostov-na-donu': 'Europe/Moscow',
  krasnoyarsk: 'Asia/Krasnoyarsk',
  novosibirsk: 'Asia/Novosibirsk',
  ekaterinburg: 'Asia/Yekaterinburg',
  yekaterinburg: 'Asia/Yekaterinburg',
};

export function getCityTimezone(citySlug?: string | null): string {
  if (!citySlug) return DEFAULT_CALENDAR_TZ;
  return CITY_TIMEZONES[citySlug] ?? DEFAULT_CALENDAR_TZ;
}

/** Календарный день момента `iso` в заданном поясе */
export function calendarDayFromIso(iso: string, tz: string = DEFAULT_CALENDAR_TZ): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: tz });
}

/** @deprecated Используйте calendarDayFromIso(iso, DEFAULT_CALENDAR_TZ) */
export function moscowCalendarDayFromIso(iso: string): string {
  return calendarDayFromIso(iso, DEFAULT_CALENDAR_TZ);
}

export function dateToISO(input: Date | string, tz: string = DEFAULT_CALENDAR_TZ): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** @deprecated Используйте dateToISO(input, DEFAULT_CALENDAR_TZ) */
export function dateToMoscowISO(input: Date | string): string {
  return dateToISO(input, DEFAULT_CALENDAR_TZ);
}

export function getTodayISO(tz: string = DEFAULT_CALENDAR_TZ, now: Date = new Date()): string {
  return dateToISO(now, tz);
}

/** +24 ч по UTC, затем календарный день в `tz` */
export function getTomorrowISO(tz: string = DEFAULT_CALENDAR_TZ, now: Date = new Date()): string {
  return dateToISO(new Date(now.getTime() + 86_400_000), tz);
}

/** Добавить целые календарные дни к YYYY-MM-DD (Григориан), затем календарный день в `tz`. */
export function addCalendarDaysISO(iso: string, deltaDays: number, tz: string): string {
  const parts = iso.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return iso;
  const t = Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0);
  return dateToISO(new Date(t), tz);
}

const WEEKDAY_LONG_TO_SUN0: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/** День недели 0=вс … 6=сб для календарной даты `iso` в поясе `tz`. */
export function getWeekdaySun0FromYmdInTz(iso: string, tz: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const inst = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const long = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: tz }).format(inst);
  return WEEKDAY_LONG_TO_SUN0[long] ?? 0;
}

/**
 * Ближайшие суббота–воскресенье в календаре города (как старая логика Date.getDay на локали,
 * но в IANA-поясе города).
 */
export function getNextWeekendSatSunISO(tz: string, now: Date = new Date()): [string, string] {
  const iso = getTodayISO(tz, now);
  const dow = getWeekdaySun0FromYmdInTz(iso, tz);
  const daysToSat = dow === 6 ? 0 : dow === 0 ? 6 : 6 - dow;
  const satIso = addCalendarDaysISO(iso, daysToSat, tz);
  const sunIso = addCalendarDaysISO(satIso, 1, tz);
  return [satIso, sunIso];
}

/** Диапазон для URL/API: `YYYY-MM-DD..YYYY-MM-DD` */
export function getNextWeekendRangeISO(tz: string, now: Date = new Date()): string {
  const [sat, sun] = getNextWeekendSatSunISO(tz, now);
  return `${sat}..${sun}`;
}

export function getMoscowTodayISO(now: Date = new Date()): string {
  return getTodayISO(DEFAULT_CALENDAR_TZ, now);
}

export function getMoscowTomorrowISO(now: Date = new Date()): string {
  return getTomorrowISO(DEFAULT_CALENDAR_TZ, now);
}
