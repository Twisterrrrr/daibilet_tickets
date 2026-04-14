import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fetchMergePreview,
  fetchSimilarDrafts,
  mergeVenueInto,
  type AdminVenueCandidateRow,
} from '@/modules/venues/api/candidates';
import { SimilarVenueList } from '@/modules/venues/components/candidates/SimilarVenueList';
import { VenueMergePreviewPanel } from '@/modules/venues/components/candidates/VenueMergePreviewPanel';
import { AdminMutationErrorAlert } from '@/lib/admin-mutation-error-alert';
import { getAdminErrorDisplay, type AdminErrorDisplay } from '@/lib/get-admin-error-message';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: AdminVenueCandidateRow | null;
  onSuccess: () => void;
};

export function MergeVenueDialog({ open, onOpenChange, row, onSuccess }: Props) {
  const qc = useQueryClient();
  const id = row?.id;
  const [selected, setSelected] = React.useState<string | null>(null);
  const [mutationErr, setMutationErr] = React.useState<AdminErrorDisplay | null>(null);

  const similarQ = useQuery({
    queryKey: ['venue-similar-drafts', id, 'merge'],
    queryFn: () => fetchSimilarDrafts(id!, { includeActive: true, limit: 10 }),
    enabled: open && Boolean(id),
  });

  const previewQ = useQuery({
    queryKey: ['venue-merge-preview', id, selected],
    queryFn: () => fetchMergePreview(id!, selected!),
    enabled: open && Boolean(id && selected),
    retry: 1,
  });

  React.useEffect(() => {
    if (!open) {
      setSelected(null);
      setMutationErr(null);
    }
  }, [open]);

  const canConfirm =
    Boolean(selected) && previewQ.isSuccess && Boolean(previewQ.data) && !previewQ.isFetching;

  const m = useMutation({
    mutationFn: async () => {
      if (!id || !selected) throw new Error('Выберите целевую площадку');
      const p = previewQ.data;
      return mergeVenueInto(id, {
        targetVenueId: selected,
        expectedSourceUpdatedAt: p?.candidate.updatedAt ?? row?.updatedAt,
        expectedTargetUpdatedAt: p?.target.updatedAt,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['venue-candidates'] });
      await qc.invalidateQueries({ queryKey: ['venue-similar-drafts'] });
      await qc.invalidateQueries({ queryKey: ['venue-similar-drafts-batch'] });
      await qc.invalidateQueries({ queryKey: ['venue-merge-preview'] });
      onOpenChange(false);
      onSuccess();
    },
    onError: (e: unknown) => {
      setMutationErr(getAdminErrorDisplay(e));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Объединить площадку</DialogTitle>
          <DialogDescription>
            Кандидат: <span className="font-medium text-foreground">{row?.title ?? '—'}</span>. Текущая запись станет
            MERGED, связи перенесутся на выбранную ACTIVE-площадку. Сначала проверьте предпросмотр.
          </DialogDescription>
        </DialogHeader>

        {similarQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Поиск похожих…</p>
        ) : similarQ.isError ? (
          <p className="text-sm text-rose-600">
            {similarQ.error instanceof Error ? similarQ.error.message : 'Ошибка'}
          </p>
        ) : (
          <SimilarVenueList items={similarQ.data?.items ?? []} selectedId={selected} onSelect={setSelected} />
        )}

        <div className="space-y-3 border-t pt-3">
          <div className="text-sm font-medium">Предпросмотр merge</div>
          {!selected ? (
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              Выберите площадку для объединения
            </p>
          ) : previewQ.isLoading || previewQ.isFetching ? (
            <p className="text-sm text-muted-foreground">Загрузка предпросмотра…</p>
          ) : previewQ.isError ? (
            <div className="space-y-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
              <p>
                {previewQ.error instanceof Error ? previewQ.error.message : 'Не удалось загрузить предпросмотр'}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => void previewQ.refetch()}>
                Повторить
              </Button>
            </div>
          ) : previewQ.data ? (
            <VenueMergePreviewPanel preview={previewQ.data} />
          ) : null}
        </div>

        <AdminMutationErrorAlert display={mutationErr} />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canConfirm || m.isPending}
            onClick={() => m.mutate()}
          >
            {m.isPending ? 'Слияние…' : 'Подтвердить merge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
