const dtf = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dtfShort = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatDateTime(iso: string): string {
  try {
    return dtf.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateShort(iso: string): string {
  try {
    return dtfShort.format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Дата и день недели для строки сетки расписания (ru-RU), напр. «6 апр., пн». */
export function formatScheduleGridDayLabel(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  }).format(date);
}

/** Только дата по-русски для подсказок в полях, напр. «15 апр. 2026 г.». */
export function formatDatePlaceholderLocal(y: number, monthIndex: number, day: number): string {
  try {
    return dtfShort.format(new Date(y, monthIndex, day));
  } catch {
    return '';
  }
}

export function formatMoney(amount: number, currency = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
