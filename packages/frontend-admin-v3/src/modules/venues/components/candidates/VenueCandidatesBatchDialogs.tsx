import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BatchVenueActionResultDto, VenueModerationReasonCode } from '@/modules/venues/api/candidates';
import { VenueRejectReasonFields } from '@/modules/venues/components/candidates/VenueRejectReasonFields';
import { getBatchResultItemLabel } from '@/lib/get-admin-error-message';

type ConfirmProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  count: number;
  onConfirm: () => void;
  loading: boolean;
  reasonCode: VenueModerationReasonCode | '';
  onReasonCodeChange: (v: VenueModerationReasonCode | '') => void;
  reasonText: string;
  onReasonTextChange: (v: string) => void;
};

export function VenueCandidatesBatchConfirmDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
  loading,
  reasonCode,
  onReasonCodeChange,
  reasonText,
  onReasonTextChange,
}: ConfirmProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Отклонить выбранные черновики</DialogTitle>
          <DialogDescription>
            Будет отклонено (reject) записей: {count}. Операция необратима. Часть записей может не
            пройти — итог будет в отчёте.
          </DialogDescription>
        </DialogHeader>
        <VenueRejectReasonFields
          reasonCode={reasonCode}
          onReasonCodeChange={onReasonCodeChange}
          reasonText={reasonText}
          onReasonTextChange={onReasonTextChange}
          idPrefix="batch-reject"
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading || count <= 0}
            onClick={() => onConfirm()}
          >
            {loading ? 'Отправка…' : 'Подтвердить отказ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ResultProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  result: BatchVenueActionResultDto | null;
  actionLabel: string;
};

export function VenueBatchActionResultDialog({ open, onOpenChange, result, actionLabel }: ResultProps) {
  if (!result) return null;
  const failed = result.results.filter((r) => !r.success);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Итог: {actionLabel}</DialogTitle>
          <DialogDescription>
            Успешно: <strong>{result.successCount}</strong>, с ошибками:{' '}
            <strong>{result.failureCount}</strong> (всего в запросе: {result.total})
          </DialogDescription>
        </DialogHeader>
        {failed.length > 0 ? (
          <div className="space-y-2 text-sm">
            <div className="font-medium text-rose-700 dark:text-rose-300">Ошибки по записям</div>
            <ul className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-2">
              {failed.map((r) => (
                <li key={r.id} className="border-b border-dashed pb-2 last:border-0">
                  <div className="font-mono text-xs text-muted-foreground">{r.id}</div>
                  <div>{getBatchResultItemLabel(r.code, r.message)}</div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Все выбранные записи обработаны успешно.</p>
        )}
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
