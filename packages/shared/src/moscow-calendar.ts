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

export function getMoscowTodayISO(now: Date = new Date()): string {
  return getTodayISO(DEFAULT_CALENDAR_TZ, now);
}

export function getMoscowTomorrowISO(now: Date = new Date()): string {
  return getTomorrowISO(DEFAULT_CALENDAR_TZ, now);
}
