'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock } from 'lucide-react';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pad2 } from '@/lib/sessions';

type RangeSelectionItem = {
  dateKey: string; // YYYY-MM-DD
  hour: number; // 0-23
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: RangeSelectionItem[];
  onConfirm: (payload: {
    capacityTotal?: number | null;
    isActive: boolean;
    minutesByKey: Record<string, number[]>; // key: `${dateKey}|${hour}`
  }) => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

const MINUTE_PRESETS = [0, 15, 30, 45];

export function ScheduleBatchCreateRangeDialog({
  open,
  onOpenChange,
  selection,
  onConfirm,
  isSubmitting,
  errorMessage,
}: Props) {
  const [capacity, setCapacity] = useState<string>('');
  const [active, setActive] = useState(true);
  const [minutesState, setMinutesState] = useState<Record<string, number[]>>({});

  const sortedSelection = useMemo(() => {
    return [...selection].sort((a, b) => {
      if (a.dateKey === b.dateKey) return a.hour - b.hour;
      return a.dateKey.localeCompare(b.dateKey);
    });
  }, [selection]);

  // Инициализация минут по умолчанию (00) для новых ключей
  const ensureDefaultMinutes = (key: string) => {
    setMinutesState((prev) => {
      if (prev[key] && prev[key].length > 0) return prev;
      return { ...prev, [key]: [0] };
    });
  };

  const toggleMinute = (key: string, minute: number) => {
    setMinutesState((prev) => {
      const current = prev[key] ?? [0];
      const exists = current.includes(minute);
      let next = exists ? current.filter((m) => m !== minute) : [...current, minute];
      // Не даём полностью очистить: если убрали все — вернём 0
      if (next.length === 0) {
        next = [0];
      }
      return { ...prev, [key]: next.sort((a, b) => a - b) };
    });
  };

  const handleConfirm = () => {
    const cap =
      capacity.trim() === ''
        ? undefined
        : Number.isNaN(Number(capacity))
          ? undefined
          : Math.max(0, Math.floor(Number(capacity)));

    const minutesByKey: Record<string, number[]> = {};
    for (const item of sortedSelection) {
      const key = `${item.dateKey}|${item.hour}`;
      const minutes = minutesState[key] && minutesState[key].length > 0 ? minutesState[key] : [0];
      minutesByKey[key] = minutes;
    }

    onConfirm({
      capacityTotal: cap,
      isActive: active,
      minutesByKey,
    });
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" />
            Создать слоты по диапазону
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700 space-y-1.5 max-h-60 overflow-y-auto">
            {sortedSelection.map((item) => {
              const key = `${item.dateKey}|${item.hour}`;
              const minutes = minutesState[key] && minutesState[key].length > 0 ? minutesState[key] : [0];
              // Обеспечиваем дефолт 00 при первом рендере
              if (!minutesState[key]) {
                ensureDefaultMinutes(key);
              }
              return (
                <div key={key} className="space-y-1.5 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-700">
                      <span className="font-medium">{item.dateKey}</span>{' '}
                      <span className="text-slate-500">{pad2(item.hour)}:00</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Минуты: {minutes.map((m) => pad2(m)).join(', ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {MINUTE_PRESETS.map((m) => {
                      const selected = minutes.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => toggleMinute(key, m)}
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${
                            selected
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700'
                          }`}
                        >
                          :{pad2(m)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-600">
                Вместимость (мест) для всех слотов
              </label>
              <Input
                type="number"
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Авто"
              />
              <p className="text-[11px] text-slate-400">
                Если пусто — используется <span className="font-medium">defaultCapacityTotal</span> события.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-600">Статус</label>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Активные слоты
              </label>
              <p className="text-[11px] text-slate-400">
                Отключите, если хотите создать слоты в статусе «Пауза».
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-1 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={isSubmitting || !sortedSelection.length}>
            {isSubmitting ? 'Создание…' : `Создать слоты`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

