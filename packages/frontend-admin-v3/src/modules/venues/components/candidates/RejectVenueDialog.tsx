import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { rejectVenue, type AdminVenueCandidateRow, type VenueModerationReasonCode } from '@/modules/venues/api/candidates';
import { VenueRejectReasonFields } from '@/modules/venues/components/candidates/VenueRejectReasonFields';
import { AdminMutationErrorAlert } from '@/lib/admin-mutation-error-alert';
import { getAdminErrorDisplay, type AdminErrorDisplay } from '@/lib/get-admin-error-message';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: AdminVenueCandidateRow | null;
  onSuccess: () => void;
};

export function RejectVenueDialog({ open, onOpenChange, row, onSuccess }: Props) {
  const qc = useQueryClient();
  const id = row?.id;
  const [mutationErr, setMutationErr] = React.useState<AdminErrorDisplay | null>(null);
  const [reasonCode, setReasonCode] = React.useState<VenueModerationReasonCode | ''>('');
  const [reasonText, setReasonText] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setMutationErr(null);
      setReasonCode('');
      setReasonText('');
    }
  }, [open]);

  const m = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Не выбрана площадка');
      return rejectVenue(id, {
        reasonCode: reasonCode || null,
        reasonText: reasonText.trim() || null,
        expectedUpdatedAt: row?.updatedAt,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['venue-candidates'] });
      await qc.invalidateQueries({ queryKey: ['venue-similar-drafts'] });
      await qc.invalidateQueries({ queryKey: ['venue-similar-drafts-batch'] });
      onOpenChange(false);
      onSuccess();
    },
    onError: (e: unknown) => {
      setMutationErr(getAdminErrorDisplay(e));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Отклонить импортную площадку</DialogTitle>
          <DialogDescription>Статус «отклонено», публикация будет снята.</DialogDescription>
        </DialogHeader>
        {row ? <p className="text-sm font-medium">{row.title}</p> : null}
        <VenueRejectReasonFields
          reasonCode={reasonCode}
          onReasonCodeChange={setReasonCode}
          reasonText={reasonText}
          onReasonTextChange={setReasonText}
          idPrefix="single-reject"
        />
        <AdminMutationErrorAlert display={mutationErr} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" variant="destructive" disabled={m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? 'Отклонение…' : 'Отклонить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
