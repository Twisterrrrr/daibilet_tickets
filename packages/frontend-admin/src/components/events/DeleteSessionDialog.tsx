import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteSession } from '@/api/adminEventSessionsMutations';
import { formatDateRu, formatTimeRu, getSessionLockedMessage } from '@/lib/sessions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminEventSessionRow } from '@/components/events/ScheduleTab';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  session: AdminEventSessionRow | null;
};

export function DeleteSessionDialog({ open, onOpenChange, eventId, session }: Props) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('No session');
      return deleteSession(session.id);
    },
    onSuccess: async () => {
      toast.success('Сеанс удалён');
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
          <DialogTitle>Удалить сеанс?</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground">
          {session ? (
            <>
              Сеанс{' '}
              <span className="font-medium text-foreground">
                {label}
              </span>
              . Продано: {session.soldCount}.
            </>
          ) : (
            'Сеанс не выбран.'
          )}
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
            {mutation.isPending ? 'Удаление…' : 'Удалить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
*** End Patch
