'use client';

import { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';

import type { AdminEventSessionRow } from '@/components/events/ScheduleTab';
import { formatTimeRu, pad2 } from '@/lib/sessions';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type ScheduleGridRangeSelection = Set<string>; // `${dateKey}|${hour}`

type Props = {
  fromDateKey: string; // YYYY-MM-DD
  days: number;
  hoursStart: number;
  hoursEnd: number;
  sessions: AdminEventSessionRow[];
  selection: ScheduleGridRangeSelection;
  onToggleCell: (key: string) => void;
  onOpenSession: (sessionId: string) => void;
};

type HourAgg = {
  count: number;
  firstSessionId: string;
  firstStartsAt: string;
  times: string[]; // iso
};

function buildDateKeys(fromDateKey: string, days: number): string[] {
  const result: string[] = [];
  const [y, m, d] = fromDateKey.split('-').map((v) => Number.parseInt(v, 10));
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return result;
  const base = new Date(y, m - 1, d, 0, 0, 0, 0);
  for (let i = 0; i < days; i += 1) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    const key = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
    result.push(key);
  }
  return result;
}

function buildHours(hoursStart: number, hoursEnd: number): number[] {
  const hours: number[] = [];
  if (hoursStart === hoursEnd) {
    return [hoursStart];
  }
  if (hoursStart < 0 || hoursStart > 23 || hoursEnd < 0 || hoursEnd > 23) {
    return [];
  }
  if (hoursStart <= hoursEnd) {
    for (let h = hoursStart; h <= hoursEnd; h += 1) hours.push(h);
  } else {
    for (let h = hoursStart; h < 24; h += 1) hours.push(h);
    for (let h = 0; h <= hoursEnd; h += 1) hours.push(h);
  }
  return hours;
}

export function ScheduleGridRange({
  fromDateKey,
  days,
  hoursStart,
  hoursEnd,
  sessions,
  selection,
  onToggleCell,
  onOpenSession,
}: Props) {
  const dateKeys = useMemo(() => buildDateKeys(fromDateKey, days), [fromDateKey, days]);
  const hours = useMemo(() => buildHours(hoursStart, hoursEnd), [hoursStart, hoursEnd]);

  const rangeLabel = useMemo(() => {
    if (!dateKeys.length) return '';
    const start = new Date(`${dateKeys[0]}T00:00:00`);
    const end = new Date(`${dateKeys[dateKeys.length - 1]}T00:00:00`);
    const startLabel = start.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
    const endLabel = end.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
    return `${startLabel} — ${endLabel}`;
  }, [dateKeys]);

  const aggByKey = useMemo(() => {
    const map = new Map<string, HourAgg>();
    for (const s of sessions) {
      const d = new Date(s.startsAt);
      const dateKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const hour = d.getHours();
      const key = `${dateKey}|${hour}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          count: 1,
          firstSessionId: s.id,
          firstStartsAt: s.startsAt,
          times: [s.startsAt],
        });
      } else {
        const firstTs = new Date(existing.firstStartsAt).getTime();
        const curTs = d.getTime();
        map.set(key, {
          count: existing.count + 1,
          firstSessionId: curTs < firstTs ? s.id : existing.firstSessionId,
          firstStartsAt: curTs < firstTs ? s.startsAt : existing.firstStartsAt,
          times: [...existing.times, s.startsAt],
        });
      }
    }
    return map;
  }, [sessions]);

  const hasOutOfRange = useMemo(() => {
    if (!dateKeys.length || !hours.length) return false;
    const minHour = Math.min(...hours);
    const maxHour = Math.max(...hours);
    return sessions.some((s) => {
      const d = new Date(s.startsAt);
      const dateKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      if (!dateKeys.includes(dateKey)) return false;
      const h = d.getHours();
      // если часы wrap (например 10–1), то диапазон не непрерывен; просто считаем вне диапазона, если часа нет в списке hours
      return !hours.includes(h);
    });
  }, [sessions, dateKeys, hours]);

  return (
    <div className="mt-4 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>Сетка по дням и часам</span>
          {rangeLabel && <span className="text-[11px] text-slate-500">{rangeLabel}</span>}
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-primary-700">
            <span className="h-2 w-2 rounded-full bg-primary-500" />
            Выбранный час
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Уже есть сеансы
          </span>
        </div>
      </div>

      {hasOutOfRange && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          В выбранном диапазоне есть сеансы вне видимого диапазона часов. Переключитесь в режим
          «Таблица» или «День», чтобы увидеть их все.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-t border-slate-200 text-[11px]">
          <thead>
            <tr>
              <th className="w-24 border-r border-slate-200 bg-slate-50 px-2 py-1 text-left text-[10px] font-medium text-slate-500">
                Дата
              </th>
              {hours.map((h) => (
                <th
                  key={h}
                  className="min-w-[56px] border-r border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] font-medium text-slate-500"
                >
                  {pad2(h)}:00
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dateKeys.map((dateKey) => (
              <tr key={dateKey}>
                <td className="border-r border-t border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600">
                  {dateKey}
                </td>
                {hours.map((h) => {
                  const cellKey = `${dateKey}|${h}`;
                  const agg = aggByKey.get(cellKey);
                  const selected = selection.has(cellKey);
                  const hasSessions = !!agg;
                  return (
                    <td
                      key={h}
                      className="border-t border-r border-slate-200 px-0.5 py-0.5 align-top"
                    >
                      {hasSessions ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="flex h-8 w-full items-center justify-center rounded border border-slate-400 bg-slate-100 text-[10px] text-slate-700 transition-colors hover:bg-slate-200"
                              onClick={() => onOpenSession(agg.firstSessionId)}
                            >
                              <span className="truncate">
                                {agg.count === 1 ? '1 сеанс' : `${agg.count} сеансов`}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span className="text-[11px]">
                              {agg.times
                                .map((t) => formatTimeRu(t))
                                .sort()
                                .join(', ')}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <button
                          type="button"
                          className={`flex h-8 w-full items-center justify-center rounded border text-[10px] transition-colors ${
                            selected
                              ? 'border-primary-500 bg-primary-50 text-primary-700 hover:bg-primary-100'
                              : 'border-dashed border-slate-200 text-slate-300 hover:border-primary-300 hover:text-primary-600'
                          }`}
                          onClick={() => onToggleCell(cellKey)}
                        >
                          {selected ? <span className="font-medium">+ час</span> : null}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

