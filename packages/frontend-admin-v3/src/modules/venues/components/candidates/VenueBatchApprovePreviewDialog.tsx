import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BatchVenueApprovePreviewDto } from '@/modules/venues/api/candidates';
import {
  venueApprovePreviewItemStatusLabel,
  venueApprovePreviewSlugStatusLabel,
} from '@/modules/venues/utils/venue-slug-status-labels';
type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preview: BatchVenueApprovePreviewDto | null;
  loading: boolean;
  onConfirm: () => void;
  confirmLoading: boolean;
};

function statusBorderClass(status: 'OK' | 'WARNING' | 'ERROR'): string {
  switch (status) {
    case 'OK':
      return 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20';
    case 'WARNING':
      return 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20';
    case 'ERROR':
    default:
      return 'border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20';
  }
}

export function VenueBatchApprovePreviewDialog({
  open,
  onOpenChange,
  preview,
  loading,
  onConfirm,
  confirmLoading,
}: Props) {
  const processable =
    preview?.items.filter((i) => i.status === 'OK' || i.status === 'WARNING') ?? [];
  const canConfirm = processable.length > 0 && !loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Подтверждение пакетного approve</DialogTitle>
          <DialogDescription>
            Проверка slug и статусов (мягкая; между предпросмотром и подтверждением данные могут
            измениться).
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Загрузка предпросмотра…</p>
        ) : preview ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">всего: {preview.summary.total}</Badge>
              <Badge variant="success">ок: {preview.summary.ok}</Badge>
              <Badge variant="warning">предупреждения: {preview.summary.warnings}</Badge>
              <Badge variant="danger">ошибки: {preview.summary.errors}</Badge>
            </div>

            {!canConfirm ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
                Нет записей, которые можно подтвердить (все с ошибкой или список пуст). Обновите
                выбор или список.
              </p>
            ) : null}

            <ul className="space-y-2">
              {preview.items.map((it) => (
                <li
                  key={it.venueId}
                  className={`rounded-md border px-3 py-2 text-sm ${statusBorderClass(it.status)}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{it.venueId}</span>
                    <Badge variant="outline">{venueApprovePreviewItemStatusLabel(it.status)}</Badge>
                    <Badge variant="outline">{venueApprovePreviewSlugStatusLabel(it.slugStatus)}</Badge>
                  </div>
                  <div className="mt-1 font-medium">{it.title || '—'}</div>
                  <div className="text-xs text-muted-foreground">
                    slug: <span className="font-mono">{it.proposedSlug || '—'}</span>
                  </div>
                  {it.warningCodes.length > 0 ? (
                    <div className="mt-1 text-xs text-amber-900 dark:text-amber-200">
                      {it.warningCodes.join(', ')}
                    </div>
                  ) : null}
                  {it.errorCode ? (
                    <div className="mt-1 text-xs text-rose-800 dark:text-rose-200">{it.errorCode}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Нет данных предпросмотра.</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={confirmLoading}>
            Отмена
          </Button>
          <Button type="button" disabled={!canConfirm || confirmLoading} onClick={() => onConfirm()}>
            {confirmLoading ? 'Отправка…' : 'Подтвердить approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
