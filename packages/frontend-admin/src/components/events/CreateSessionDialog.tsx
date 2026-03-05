import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createSession } from '@/api/adminEventSessionsMutations';
import { buildIsoFromInputs, getSessionLockedMessage } from '@/lib/sessions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
};

export function CreateSessionDialog({ open, onOpenChange, eventId }: Props) {
  const qc = useQueryClient();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [capacity, setCapacity] = useState<string>('');

  const canSubmit = !!date && !!time && (capacity === '' || !Number.isNaN(Number(capacity)));

  const mutation = useMutation({
    mutationFn: async () => {
      const startsAt = buildIsoFromInputs(date, time);
      const cap = capacity === '' ? null : Number(capacity);
      return createSession(eventId, { startsAt, capacity: cap });
    },
    onSuccess: async () => {
      toast.success('Сеанс создан');
      onOpenChange(false);
      setDate('');
      setTime('');
      setCapacity('');
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
          <DialogTitle>Добавить сеанс</DialogTitle>
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
            <Label>Вместимость (опционально)</Label>
            <Input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="— (по умолчанию из события)"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Отмена
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? 'Создание…' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

