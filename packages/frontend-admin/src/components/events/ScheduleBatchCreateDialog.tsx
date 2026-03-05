'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock } from 'lucide-react';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateRu, formatTimeRu } from '@/lib/sessions';

type Slot = {
  startsAt: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateLabel: string;
  slots: Slot[];
  onConfirm: (payload: { capacityTotal?: number | null; isActive: boolean }) => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

export function ScheduleBatchCreateDialog({
  open,
  onOpenChange,
  dateLabel,
  slots,
  onConfirm,
  isSubmitting,
  errorMessage,
}: Props) {
  const [capacity, setCapacity] = useState<string>('');
  const [active, setActive] = useState(true);

  const groupedByHour = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const s of slots) {
      const d = new Date(s.startsAt);
      const h = d.getHours();
      const arr = map.get(h) ?? [];
      arr.push(formatTimeRu(s.startsAt));
      map.set(h, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, times]) => ({
        hour,
        times: times.sort(),
      }));
  }, [slots]);

  const handleConfirm = () => {
    const cap =
      capacity.trim() === ''
        ? undefined
        : Number.isNaN(Number(capacity))
          ? undefined
          : Math.max(0, Math.floor(Number(capacity)));
    onConfirm({ capacityTotal: cap, isActive: active });
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" />
            Создать {slots.length} слотов
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <p className="text-slate-600">
            Дата: <span className="font-medium">{dateLabel}</span>
          </p>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700 space-y-1.5">
            {groupedByHour.map((g) => (
              <div key={g.hour} className="flex gap-2">
                <span className="w-10 shrink-0 font-medium text-slate-600">
                  {String(g.hour).padStart(2, '0')}:00
                </span>
                <span className="text-slate-700">{g.times.join(', ')}</span>
              </div>
            ))}
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
          <Button size="sm" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Создание…' : `Создать ${slots.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

