'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const MONTHS_NOM = [
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

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function isoFromYmd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function parseIso(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}

function cmpIso(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Понедельник = 0 … воскресенье = 6 */
function mondayIndex(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

/**
 * Только подпись «Другая дата» + выпадающий календарь с русской локалью (без нативного input type="date").
 */
export function SaluteOtherDateButton({
  value,
  onChange,
  min,
  max,
  active,
}: {
  value: string;
  onChange: (iso: string) => void;
  min: string;
  max: string;
  /** Выбрана «иная» дата (не сегодня/завтра) */
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const minP = useMemo(() => parseIso(min), [min]);
  const maxP = useMemo(() => parseIso(max), [max]);

  const [viewMonth, setViewMonth] = useState(() => {
    const a = parseIso(min);
    return a ? new Date(a.y, a.m - 1, 1) : new Date();
  });

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const cells = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const first = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0).getDate();
    const pad = mondayIndex(first);
    const arr: Array<number | null> = [];
    for (let i = 0; i < pad; i++) arr.push(null);
    for (let d = 1; d <= lastDay; d++) arr.push(d);
    while (arr.length < 42) arr.push(null);
    return arr.slice(0, 42);
  }, [viewMonth]);

  const canPrev = useMemo(() => {
    if (!minP) return false;
    const viewStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const minMonthStart = new Date(minP.y, minP.m - 1, 1);
    return viewStart > minMonthStart;
  }, [viewMonth, minP]);

  const canNext = useMemo(() => {
    if (!maxP) return false;
    const nextMonthFirst = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    const maxDate = new Date(maxP.y, maxP.m - 1, maxP.d);
    return nextMonthFirst <= maxDate;
  }, [viewMonth, maxP]);

  const goPrev = useCallback(() => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);

  const goNext = useCallback(() => {
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);

  const dayIso = useCallback(
    (day: number) => {
      const y = viewMonth.getFullYear();
      const m = viewMonth.getMonth() + 1;
      return isoFromYmd(y, m, day);
    },
    [viewMonth],
  );

  const isDisabled = useCallback(
    (day: number) => {
      if (!minP || !maxP) return true;
      const s = dayIso(day);
      return cmpIso(s, min) < 0 || cmpIso(s, max) > 0;
    },
    [dayIso, min, max, minP, maxP],
  );

  const toggleOpen = useCallback(() => {
    if (!minP || !maxP) return;
    setOpen((o) => {
      const next = !o;
      if (next) {
        const sel = value ? parseIso(value) : null;
        setViewMonth(
          sel ? new Date(sel.y, sel.m - 1, 1) : new Date(minP.y, minP.m - 1, 1),
        );
      }
      return next;
    });
  }, [minP, maxP, value]);

  if (!minP || !maxP) return null;

  return (
    <div className="relative inline-block" ref={wrapRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex min-h-[2.25rem] items-center rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
          active
            ? 'border-primary-400 bg-primary-50 text-primary-800 ring-1 ring-primary-200/60'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
        }`}
      >
        Другая дата
      </button>

      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-[60] w-[min(100vw-2rem,17.5rem)] rounded-xl border border-slate-200 bg-white py-2 shadow-lg"
          role="dialog"
          aria-label="Календарь"
        >
          <div className="flex items-center justify-between gap-1 border-b border-slate-100 px-2 pb-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canPrev}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <span className="min-w-0 flex-1 text-center text-sm font-semibold text-slate-900">
              {MONTHS_NOM[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Следующий месяц"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0 px-2 pt-2 text-center text-[11px] font-medium text-slate-500">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px px-2 pb-2 pt-1">
            {cells.map((day, i) => {
              if (day == null) {
                return <div key={i} className="aspect-square min-h-[2rem]" />;
              }
              const iso = dayIso(day);
              const disabled = isDisabled(day);
              const isSel = value === iso;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`flex aspect-square min-h-[2rem] items-center justify-center rounded-lg text-[13px] font-semibold transition-colors ${
                    disabled
                      ? 'cursor-not-allowed text-slate-300'
                      : isSel
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end border-t border-slate-100 px-2 pt-2">
            <button
              type="button"
              className="text-xs font-semibold text-primary-700 hover:underline"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Очистить
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
