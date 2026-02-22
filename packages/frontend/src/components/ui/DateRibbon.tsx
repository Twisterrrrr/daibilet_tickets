'use client';

import { Calendar, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface DateRibbonProps {
  /** ISO-дата выбранного дня (yyyy-mm-dd) или null */
  selected: string | null;
  /** Вызывается при выборе даты или сбросе (null) */
  onChange: (date: string | null) => void;
}

/** Кол-во дней в ленте (сегодня + 13 дней вперёд) */
const DAYS_COUNT = 14;

/** Форматировать Date в yyyy-mm-dd */
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** День недели сокращённо (пн, вт...) */
function weekdayShort(d: Date): string {
  return d.toLocaleDateString('ru-RU', { weekday: 'short' });
}

/** Число + месяц ("12 фев") */
function dayMonth(d: Date): string {
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/** Проверить, является ли дата сегодня/завтра */
function getDayLabel(d: Date, today: Date): string | null {
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - t.getTime()) / 86400000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  return null;
}

/** Проверить, является ли дата выходным (сб/вс) */
function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Найти ближайшие выходные (сб+вс), вернуть ISO-строки */
function getNextWeekend(today: Date): [string, string] {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay();
  const daysToSat = dayOfWeek === 6 ? 0 : dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
  const sat = new Date(d);
  sat.setDate(d.getDate() + daysToSat);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return [toISODate(sat), toISODate(sun)];
}

/** Понедельник = 0 */
function getWeekdayMonFirst(d: Date): number {
  return (d.getDay() + 6) % 7;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
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

export function DateRibbon({ selected, onChange }: DateRibbonProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => toISODate(today), [today]);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Генерируем дни
  const days = useMemo(() => {
    const result: { date: Date; iso: string; label: string | null; isWeekend: boolean }[] = [];
    for (let i = 0; i < DAYS_COUNT; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      d.setHours(0, 0, 0, 0);
      result.push({
        date: d,
        iso: toISODate(d),
        label: getDayLabel(d, today),
        isWeekend: isWeekend(d),
      });
    }
    return result;
  }, [today]);

  const [weekendSat, weekendSun] = useMemo(() => getNextWeekend(today), [today]);
  const isWeekendSelected = selected === weekendSat || selected === `${weekendSat}..${weekendSun}`;

  // Авто-скролл к выбранному элементу
  useEffect(() => {
    if (!selected || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-date="${selected.split('..')[0]}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selected]);

  const isOtherDateSelected =
    selected && !days.some((d) => d.iso === selected) && selected !== `${weekendSat}..${weekendSun}`;

  // При открытии календаря показывать месяц выбранной даты или текущий
  useEffect(() => {
    if (calendarOpen && selected && selected.length === 10) {
      const [y, m] = selected.split('-').map(Number);
      setDisplayMonth((prev) => {
        const next = new Date(prev);
        next.setFullYear(y, m - 1, 1);
        next.setHours(0, 0, 0, 0);
        return next;
      });
    }
  }, [calendarOpen, selected]);

  // Клик снаружи — закрыть календарь
  useEffect(() => {
    if (!calendarOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [calendarOpen]);

  const calendarGrid = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = getWeekdayMonFirst(first);
    const daysInMonth = last.getDate();
    const cells: { iso: string; day: number; isCurrentMonth: boolean; isPast: boolean }[] = [];
    for (let i = 0; i < startPad; i++) cells.push({ iso: '', day: 0, isCurrentMonth: false, isPast: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = iso < todayISO;
      cells.push({ iso, day: d, isCurrentMonth: true, isPast });
    }
    return cells;
  }, [displayMonth, todayISO]);

  const goPrevMonth = () => {
    setDisplayMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() - 1);
      next.setDate(1);
      return next;
    });
  };
  const goNextMonth = () => {
    setDisplayMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1);
      next.setDate(1);
      return next;
    });
  };

  const handlePickDate = (iso: string) => {
    if (iso && iso >= todayISO) {
      onChange(iso);
      setCalendarOpen(false);
    }
  };

  return (
    <div className="relative flex items-stretch gap-2">
      <div
        ref={scrollRef}
        className="flex flex-1 min-w-0 items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory"
      >
        {/* "Все даты" — сброс */}
        <button
          onClick={() => onChange(null)}
          className={`flex shrink-0 snap-start items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            selected === null
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Все даты
        </button>

        {/* Кнопка "Выходные" */}
        <button
          onClick={() => onChange(`${weekendSat}..${weekendSun}`)}
          className={`flex shrink-0 snap-start items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isWeekendSelected
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
          }`}
        >
          Выходные
        </button>

        {/* Разделитель */}
        <div className="mx-0.5 h-6 w-px shrink-0 bg-slate-200" />

        {/* Дни */}
        {days.map((day) => {
          const isSelected = selected === day.iso;
          return (
            <button
              key={day.iso}
              data-date={day.iso}
              onClick={() => onChange(day.iso)}
              className={`flex shrink-0 snap-start flex-col items-center rounded-lg px-3 py-1.5 text-center transition-colors min-w-[56px] ${
                isSelected
                  ? 'bg-primary-600 text-white shadow-sm'
                  : day.isWeekend
                    ? 'bg-amber-50 text-slate-700 ring-1 ring-amber-200 hover:bg-amber-100'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <span
                className={`text-[10px] uppercase leading-tight ${
                  isSelected ? 'text-white/80' : day.isWeekend ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                {day.label || weekdayShort(day.date)}
              </span>
              <span className="text-sm font-semibold leading-tight mt-0.5">
                {day.label ? dayMonth(day.date) : day.date.getDate()}
              </span>
              {!day.label && (
                <span className={`text-[10px] leading-tight ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                  {day.date.toLocaleDateString('ru-RU', { month: 'short' })}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Другая дата + календарь рядом */}
      <div ref={calendarRef} className="relative flex shrink-0 items-start">
        <button
          type="button"
          onClick={() => setCalendarOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isOtherDateSelected
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          {isOtherDateSelected && selected
            ? (() => {
                const d = new Date(selected + 'T12:00:00');
                return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
              })()
            : 'Другая дата'}
        </button>

        {calendarOpen && (
          <div className="absolute right-0 top-full z-20 mt-1.5 w-[min(280px,100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-2">
              <button
                type="button"
                onClick={goPrevMonth}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Предыдущий месяц"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-slate-800 min-w-[120px] text-center">
                {MONTHS[displayMonth.getMonth()]} {displayMonth.getFullYear()}
              </span>
              <button
                type="button"
                onClick={goNextMonth}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Следующий месяц"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1 text-center text-[10px] font-medium uppercase text-slate-400">
                  {w}
                </div>
              ))}
              {calendarGrid.map((cell, i) => (
                <button
                  key={cell.iso || `e-${i}`}
                  type="button"
                  disabled={cell.isPast || !cell.iso}
                  onClick={() => cell.iso && handlePickDate(cell.iso)}
                  className={`min-w-[32px] rounded-lg py-1.5 text-sm transition-colors ${
                    !cell.iso || cell.isPast
                      ? 'cursor-default text-slate-300'
                      : cell.iso === selected
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cell.day || ''}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
