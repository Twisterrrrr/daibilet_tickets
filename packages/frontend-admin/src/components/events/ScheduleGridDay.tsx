'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';

import type { AdminEventSessionRow } from '@/components/events/ScheduleTab';
import { formatDateRu, formatTimeRu, isoToDateInput } from '@/lib/sessions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type ScheduleGridSelection = Set<string>;

type Props = {
  date: string; // YYYY-MM-DD
  sessions: AdminEventSessionRow[];
  selection: ScheduleGridSelection;
  onToggleSlot: (startsAtIso: string) => void;
  onEditSession: (session: AdminEventSessionRow) => void;
};

// Часы сетки: с 10:00 текущего дня до 01:00 следующего (10,11,...,23,00,01)
const GRID_HOURS: number[] = [];
for (let h = 10; h < 24; h += 1) {
  GRID_HOURS.push(h);
}
GRID_HOURS.push(0, 1);
const STEP_MINUTES = 15;

export function ScheduleGridDay({
  date,
  sessions,
  selection,
  onToggleSlot,
  onEditSession,
}: Props) {
  const minutesRows = useMemo(() => {
    const rows: number[] = [];
    for (let m = 0; m < 60; m += STEP_MINUTES) {
      rows.push(m);
    }
    return rows;
  }, []);

  const [hoverHour, setHoverHour] = useState<number | null>(null);

  const sessionsByKey = useMemo(() => {
    const map = new Map<string, AdminEventSessionRow>();
    for (const s of sessions) {
      if (isoToDateInput(s.startsAt) !== date) continue;
      const d = new Date(s.startsAt);
      const key = `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      if (map.has(key)) {
        // Исторические дубли: показываем первый, но подсвечиваем в консоли (dev).
        if (!import.meta.env.PROD) {
          // eslint-disable-next-line no-console
          console.warn('Duplicate sessions for the same startsAt in grid', {
            date,
            key,
          });
        }
        continue;
      }
      map.set(key, s);
    }
    return map;
  }, [sessions, date]);

  const handleCellClick = (hour: number, minute: number) => {
    const startsAtIso = new Date(
      `${date}T${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}:00`,
    ).toISOString();
    const session = sessionsByKey.get(
      `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`,
    );
    if (session) {
      onEditSession(session);
    } else {
      onToggleSlot(startsAtIso);
    }
  };

  const isSelected = (hour: number, minute: number) => {
    const iso = new Date(
      `${date}T${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}:00`,
    ).toISOString();
    return selection.has(iso);
  };

  const headerDateLabel = useMemo(() => {
    const d = new Date(`${date}T00:00:00`);
    // Явно фиксируем русский формат, чтобы не путаться с MM/DD
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [date]);

  return (
    <div className="mt-4 rounded-lg border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>Сетка за день</span>
          <span className="font-medium">{headerDateLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-primary-700">
            <span className="h-2 w-2 rounded-full bg-primary-500" />
            Слот к созданию
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Уже созданный сеанс
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-t border-slate-200 text-[11px]">
          <thead>
            <tr>
              <th className="w-16 border-r border-slate-200 bg-slate-50 px-2 py-1 text-left text-[10px] font-medium text-slate-500">
                Время
              </th>
              {GRID_HOURS.map((h) => (
                  <th
                    key={h}
                    className="min-w-[56px] border-r border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] font-medium text-slate-500"
                    onMouseEnter={() => setHoverHour(h)}
                    onMouseLeave={() => setHoverHour((prev) => (prev === h ? null : prev))}
                  >
                    {h.toString().padStart(2, '0')}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {minutesRows.map((minute) => (
              <tr key={minute}>
                <td className="border-r border-t border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
                  {minute.toString().padStart(2, '0')}
                </td>
                {GRID_HOURS.map((hour) => {
                  const key = `${hour.toString().padStart(2, '0')}:${minute
                    .toString()
                    .padStart(2, '0')}`;
                  const session = sessionsByKey.get(key);
                  const selected = isSelected(hour, minute);

                  return (
                    <td
                      key={hour}
                      className={`border-t border-r border-slate-200 px-0.5 py-0.5 align-top ${
                        hoverHour === hour ? 'bg-slate-50' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleCellClick(hour, minute)}
                        className={`flex h-7 w-full items-center justify-center rounded border text-[10px] transition-colors ${
                          session
                            ? 'border-slate-400 bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : selected
                              ? 'border-primary-500 bg-primary-50 text-primary-700 hover:bg-primary-100'
                              : 'border-dashed border-slate-200 text-slate-300 hover:border-primary-300 hover:text-primary-600'
                        }`}
                        title={
                          session
                            ? `${formatTimeRu(session.startsAt)} · ${
                                session.capacity ?? '—'
                              } мест · продано ${session.soldCount}`
                            : 'Создать слот'
                        }
                      >
                        {session ? (
                          <span className="truncate">
                            {formatTimeRu(session.startsAt)}
                          </span>
                        ) : selected ? (
                          <Plus className="h-3 w-3" />
                        ) : null}
                      </button>
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

