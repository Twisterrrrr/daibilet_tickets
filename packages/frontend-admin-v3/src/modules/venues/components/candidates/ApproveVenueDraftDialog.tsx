import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  approveVenueDraft,
  fetchAdminVenueDetail,
  fetchSimilarDrafts,
  type AdminVenueCandidateRow,
} from '@/modules/venues/api/candidates';
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

export function ApproveVenueDraftDialog({ open, onOpenChange, row, onSuccess }: Props) {
  const qc = useQueryClient();
  const id = row?.id;
  const detailQ = useQuery({
    queryKey: ['admin-venue-detail', id],
    queryFn: () => fetchAdminVenueDetail(id!),
    enabled: open && Boolean(id),
  });
  const similarQ = useQuery({
    queryKey: ['venue-similar-drafts', id],
    queryFn: () => fetchSimilarDrafts(id!),
    enabled: open && Boolean(id),
  });

  const [title, setTitle] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [isPublished, setIsPublished] = React.useState(false);
  const [mutationErr, setMutationErr] = React.useState<AdminErrorDisplay | null>(null);

  React.useEffect(() => {
    if (!open || !detailQ.data) return;
    const d = detailQ.data;
    setTitle(d.title);
    setAddress(d.address ?? '');
    setSlug(d.slug ?? '');
    setIsPublished(false);
    setMutationErr(null);
  }, [open, detailQ.data]);

  React.useEffect(() => {
    if (!open) setMutationErr(null);
  }, [open]);

  const m = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Не выбрана площадка');
      const expectedUpdatedAt = detailQ.data?.updatedAt ?? row?.updatedAt;
      return approveVenueDraft(id, {
        title: title.trim(),
        address: address.trim() || undefined,
        slug: slug.trim() || undefined,
        isPublished: isPublished || undefined,
        expectedUpdatedAt,
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

  const dupHint = (similarQ.data?.items?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Утвердить черновик площадки</DialogTitle>
          <DialogDescription>
            После утверждения статус станет ACTIVE, mergeTarget сбросится, needsReview = false.
          </DialogDescription>
        </DialogHeader>

        {detailQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        ) : detailQ.isError ? (
          <p className="text-sm text-rose-600">{detailQ.error instanceof Error ? detailQ.error.message : 'Ошибка'}</p>
        ) : (
          <div className="space-y-3">
            {dupHint ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Внимание: найдены похожие площадки ({similarQ.data?.items.length}). Проверьте перед публикацией.
              </p>
            ) : null}
            <label className="block text-sm">
              <span className="text-muted-foreground">Название</span>
              <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Адрес</span>
              <Input className="mt-1" value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Слаг</span>
              <Input className="mt-1 font-mono text-sm" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              Опубликовать страницу (isPublished), если проходят проверки
            </label>
            {detailQ.data ? (
              <div className="rounded-md border bg-muted/40 p-3 text-xs">
                <div className="font-medium">Нормализация (предпросмотр)</div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  name: {detailQ.data.normalizedName ?? '—'}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  addr: {detailQ.data.normalizedAddress ?? '—'}
                </div>
              </div>
            ) : null}
            <AdminMutationErrorAlert display={mutationErr} />
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" disabled={m.isPending || detailQ.isLoading} onClick={() => m.mutate()}>
            {m.isPending ? 'Сохранение…' : 'Утвердить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
