import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateSession } from '@/api/adminEventSessionsMutations';
import { buildIsoFromInputs, getSessionLockedMessage, isoToDateInput, isoToTimeInput } from '@/lib/sessions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminEventSessionRow } from '@/components/events/ScheduleTab';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  session: AdminEventSessionRow | null;
  defaultStartIso?: string;
};

export function EditSessionDialog({ open, onOpenChange, eventId, session, defaultStartIso }: Props) {
  const qc = useQueryClient();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [capacity, setCapacity] = useState<string>('');

  const soldCount = session?.soldCount ?? 0;

  useEffect(() => {
    if (!session) return;
    const startIso = defaultStartIso ?? session.startsAt;
    setDate(isoToDateInput(startIso));
    setTime(isoToTimeInput(startIso));
    setCapacity(session.capacity == null ? '' : String(session.capacity));
  }, [session, defaultStartIso]);

  const canSubmit = useMemo(() => {
    if (!date || !time) return false;
    if (capacity !== '' && Number.isNaN(Number(capacity))) return false;
    if (capacity !== '' && Number(capacity) < soldCount) return false;
    return true;
  }, [date, time, capacity, soldCount]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('No session');
      const startsAt = buildIsoFromInputs(date, time);
      const cap = capacity === '' ? null : Number(capacity);
      return updateSession(session.id, { startsAt, capacity: cap });
    },
    onSuccess: async () => {
      toast.success('Сеанс обновлён');
      onOpenChange(false);
      await qc.invalidateQueries({ queryKey: ['admin', 'eventSessionsRange'], exact: false });
    },
    onError: (e) => {
      toast.error(getSessionLockedMessage(e));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Изменить сеанс</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Дата</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              title="Формат: DD/MM/YYYY в интерфейсе, ISO в значении"
            />
          </div>
          <div className="grid gap-2">
            <Label>Время</Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="^\\d{2}:\\d{2}$"
              placeholder="HH:MM"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Вместимость</Label>
            <Input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="—"
              min={soldCount}
            />
            {capacity !== '' && Number(capacity) < soldCount && (
              <div className="text-xs text-destructive">Нельзя меньше проданного: {soldCount}</div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Отмена
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

