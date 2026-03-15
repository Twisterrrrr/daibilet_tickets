import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { clsx } from 'clsx';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (next: DateRange) => void;
  className?: string;
  presets?: ('today' | 'week' | 'month')[];
}

const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

interface DayCell {
  date: Date;
  inCurrentMonth: boolean;
}

function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

function addMonths(d: Date, count: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + count);
  return next;
}

function getMonthMatrix(year: number, month: number): DayCell[][] {
  // first day of month
  const first = new Date(year, month, 1);
  const firstWeekday = first.getDay() || 7; // 1..7, where 1 = Monday
  const start = new Date(first);
  // move back to Monday
  start.setDate(first.getDate() - (firstWeekday - 1));

  const weeks: DayCell[][] = [];
  const current = startOfDay(start);

  for (let w = 0; w < 6; w += 1) {
    const week: DayCell[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push({
        date: new Date(current),
        inCurrentMonth: current.getMonth() === month,
      });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function formatInputDate(d: Date | null): string {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function getToday(): Date {
  return startOfDay(new Date());
}

function applyPreset(preset: 'today' | 'week' | 'month'): DateRange {
  const today = getToday();
  if (preset === 'today') {
    return { from: today, to: today };
  }
  if (preset === 'week') {
    const from = new Date(today);
    const to = new Date(today);
    to.setDate(to.getDate() + 6);
    return { from, to };
  }
  // month
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from, to };
}

export function DateRangePicker({
  value,
  onChange,
  className,
  presets = ['today', 'week', 'month'],
}: DateRangePickerProps) {
  const initialMonth = useMemo(
    () => (value.from ? new Date(value.from) : getToday()),
    [value.from],
  );
  const [visibleMonth, setVisibleMonth] = useState<Date>(initialMonth);

  const leftMonth = visibleMonth;
  const rightMonth = addMonths(visibleMonth, 1);

  const handleDayClick = (day: Date) => {
    const dayStart = startOfDay(day);
    const { from, to } = value;

    if (!from || (from && to)) {
      onChange({ from: dayStart, to: null });
      return;
    }

    if (from && !to) {
      if (isBefore(dayStart, from)) {
        onChange({ from: dayStart, to: from });
      } else {
        onChange({ from, to: dayStart });
      }
    }
  };

  const isInRange = (d: Date): boolean => {
    const { from, to } = value;
    if (!from || !to) return false;
    const t = startOfDay(d).getTime();
    return t >= startOfDay(from).getTime() && t <= startOfDay(to).getTime();
  };

  const isStart = (d: Date): boolean => !!value.from && isSameDay(d, value.from);
  const isEnd = (d: Date): boolean => !!value.to && isSameDay(d, value.to);

  const renderMonth = (d: Date): ReactNode => {
    const year = d.getFullYear();
    const month = d.getMonth();
    const weeks = getMonthMatrix(year, month);

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm font-medium text-slate-800">
          <span>
            {MONTH_NAMES[month]} {year}
          </span>
        </div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-[11px] text-slate-500">
              {WEEKDAYS_SHORT.map((w) => (
                <th key={w} className="py-1 text-center font-normal">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => (
              <tr key={i}>
                {week.map((cell) => {
                  const d2 = cell.date;
                  const inRange = isInRange(d2);
                  const isStartDay = isStart(d2);
                  const isEndDay = isEnd(d2);
                  const isToday =
                    d2.getTime() === startOfDay(new Date()).getTime();

                  const baseClasses =
                    'h-8 w-8 rounded-full flex items-center justify-center text-xs cursor-pointer select-none';

                  const textMuted = !cell.inCurrentMonth
                    ? 'text-slate-300'
                    : 'text-slate-700';

                  let bg = '';
                  let text = textMuted;

                  if (inRange) {
                    bg = 'bg-blue-50';
                    text = 'text-blue-700';
                  }
                  if (isStartDay || isEndDay) {
                    bg = 'bg-blue-600 text-white';
                    text = 'text-white';
                  }
                  const todayRing =
                    isToday && !isStartDay && !isEndDay
                      ? 'ring-1 ring-blue-400'
                      : '';

                  return (
                    <td key={d2.toISOString()} className="py-0.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDayClick(d2)}
                        className={clsx(baseClasses, bg, text, todayRing)}
                      >
                        {d2.getDate()}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={clsx('inline-flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center rounded-md border px-2 py-1 bg-white">
          {formatInputDate(value.from)}{' '}
          <span className="mx-1 text-slate-400">—</span>{' '}
          {formatInputDate(value.to)}
        </span>
        <div className="flex gap-1">
          {presets.includes('today') && (
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
              onClick={() => onChange(applyPreset('today'))}
            >
              Сегодня
            </button>
          )}
          {presets.includes('week') && (
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
              onClick={() => onChange(applyPreset('week'))}
            >
              Неделя
            </button>
          )}
          {presets.includes('month') && (
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
              onClick={() => onChange(applyPreset('month'))}
            >
              Месяц
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-4 rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
            >
              ‹
            </button>
          </div>
          {renderMonth(leftMonth)}
        </div>
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-end">
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
            >
              ›
            </button>
          </div>
          {renderMonth(rightMonth)}
        </div>
      </div>
    </div>
  );
}

