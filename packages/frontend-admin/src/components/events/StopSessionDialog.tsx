import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { cancelSession } from '@/api/adminEventSessionsMutations';
import { formatDateRu, formatTimeRu, getSessionLockedMessage } from '@/lib/sessions';
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
};

export function CancelSessionDialog({ open, onOpenChange, eventId, session }: Props) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('No session');
      return cancelSession(session.id, reason || undefined);
    },
    onSuccess: async () => {
      toast.success('Сеанс отменён');
      onOpenChange(false);
      await qc.invalidateQueries({ queryKey: ['admin', 'eventSessionsRange'], exact: false });
    },
    onError: (e) => {
      toast.error(getSessionLockedMessage(e));
    },
  });

  const label = session ? `${formatDateRu(session.startsAt)} ${formatTimeRu(session.startsAt)}` : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Отменить сеанс?</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground">
          {session ? (
            <>
              Сеанс{' '}
              <span className="font-medium text-foreground">
                {label}
              </span>{' '}
              будет отменён.
            </>
          ) : (
            'Сеанс не выбран.'
          )}
        </div>

        <div className="mt-4 grid gap-2">
          <Label>Причина (опционально)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Например: перенос" />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={!session || mutation.isPending}
          >
            {mutation.isPending ? 'Отмена…' : 'Отменить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
*** End Patch
