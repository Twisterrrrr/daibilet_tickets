'use client';

import { useRef, useEffect, useMemo } from 'react';
import { CalendarDays } from 'lucide-react';

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
  // Найти ближайшую субботу
  const dayOfWeek = d.getDay();
  const daysToSat = dayOfWeek === 6 ? 0 : dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
  const sat = new Date(d);
  sat.setDate(d.getDate() + daysToSat);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return [toISODate(sat), toISODate(sun)];
}

export function DateRibbon({ selected, onChange }: DateRibbonProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);

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

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory"
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
              <span className={`text-[10px] uppercase leading-tight ${
                isSelected ? 'text-white/80' : day.isWeekend ? 'text-amber-600' : 'text-slate-400'
              }`}>
                {day.label || weekdayShort(day.date)}
              </span>
              <span className="text-sm font-semibold leading-tight mt-0.5">
                {day.label ? dayMonth(day.date) : day.date.getDate()}
              </span>
              {!day.label && (
                <span className={`text-[10px] leading-tight ${
                  isSelected ? 'text-white/70' : 'text-slate-400'
                }`}>
                  {day.date.toLocaleDateString('ru-RU', { month: 'short' })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
