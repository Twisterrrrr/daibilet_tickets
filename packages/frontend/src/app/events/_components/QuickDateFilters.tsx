'use client';

import { DEFAULT_CALENDAR_TZ, getTodayISO, getTomorrowISO, getWeekdaySun0FromYmdInTz } from '@daibilet/shared';
import { Calendar } from 'lucide-react';
import { useMemo, useState } from 'react';

import { CatalogChip } from './CatalogChip';

function labelForOtherDate(iso: string, tz: string): string {
  const [y, mo, da] = iso.split('-').map(Number);
  if (!y || !mo || !da) return iso;
  const d = new Date(Date.UTC(y, mo - 1, da, 12, 0, 0));
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short', timeZone: tz });
}

function isWeekendRange(value: string): boolean {
  return value.includes('..');
}

export function QuickDateFilters({
  selectedDate,
  onChange,
  ianaTimeZone = DEFAULT_CALENDAR_TZ,
}: {
  selectedDate: string | null;
  onChange: (date: string | null) => void;
  ianaTimeZone?: string;
}) {
  const today = useMemo(() => getTodayISO(ianaTimeZone), [ianaTimeZone]);
  const tomorrow = useMemo(() => getTomorrowISO(ianaTimeZone), [ianaTimeZone]);

  // “Выходные” = ближайшие СБ/ВС в TZ города
  const weekendRange = useMemo(() => {
    // ищем ближайшую субботу в окне 0..20 дней
    for (let i = 0; i < 21; i++) {
      const day = i === 0 ? today : addIsoDays(today, i, ianaTimeZone);
      const dow = getWeekdaySun0FromYmdInTz(day, ianaTimeZone);
      if (dow === 6) {
        const sun = addIsoDays(day, 1, ianaTimeZone);
        return `${day}..${sun}`;
      }
    }
    return null;
  }, [today, ianaTimeZone]);

  const [pickerOpen, setPickerOpen] = useState(false);

  const otherDateSelected =
    !!selectedDate &&
    selectedDate !== today &&
    selectedDate !== tomorrow &&
    selectedDate !== weekendRange &&
    !isWeekendRange(selectedDate);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CatalogChip
        label="Любая дата"
        active={selectedDate === null}
        onClick={() => {
          setPickerOpen(false);
          onChange(null);
        }}
      />
      <CatalogChip
        label="Сегодня"
        active={selectedDate === today}
        onClick={() => {
          setPickerOpen(false);
          onChange(selectedDate === today ? null : today);
        }}
      />
      <CatalogChip
        label="Завтра"
        active={selectedDate === tomorrow}
        onClick={() => {
          setPickerOpen(false);
          onChange(selectedDate === tomorrow ? null : tomorrow);
        }}
      />
      {weekendRange ? (
        <CatalogChip
          label="Выходные"
          active={selectedDate === weekendRange}
          onClick={() => {
            setPickerOpen(false);
            onChange(selectedDate === weekendRange ? null : weekendRange);
          }}
        />
      ) : null}

      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className={`inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all ${
            otherDateSelected || pickerOpen
              ? 'border-primary-400 bg-primary-50 text-primary-800 shadow-sm ring-1 ring-primary-200/60'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Calendar className="h-3.5 w-3.5 opacity-80" aria-hidden />
          {otherDateSelected && selectedDate ? labelForOtherDate(selectedDate, ianaTimeZone) : 'Другая дата'}
        </button>

        {pickerOpen ? (
          <div className="absolute left-0 top-full z-20 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="text-xs font-semibold text-slate-600">Выберите дату</div>
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              value={otherDateSelected && selectedDate ? selectedDate : ''}
              min={today}
              onChange={(e) => {
                const v = e.target.value || '';
                onChange(v ? v : null);
                setPickerOpen(false);
              }}
            />
            <div className="mt-2 text-[11px] text-slate-500">Дата считается в часовом поясе города.</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function addIsoDays(iso: string, days: number, tz: string): string {
  // iso = YYYY-MM-DD (calendar day in tz). Для нашей задачи достаточно стабильного сдвига по календарным дням.
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  void tz;
  return `${yyyy}-${mm}-${dd}`;
}

