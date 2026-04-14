import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fetchAdminVenueDetail,
  fetchSimilarDrafts,
  type AdminVenueCandidateRow,
} from '@/modules/venues/api/candidates';
import { SimilarVenueList } from '@/modules/venues/components/candidates/SimilarVenueList';
import { ImportSourceBadge, LifecycleStatusBadge, ReviewBadge, SourceTypeBadge } from '@/modules/venues/components/candidates/venue-candidate-badges';
import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: AdminVenueCandidateRow | null;
  onApprove: () => void;
  onMerge: () => void;
  onReject: () => void;
};

export function VenueCandidateDetailsDrawer({ open, onOpenChange, row, onApprove, onMerge, onReject }: Props) {
  const location = useLocation();
  const candidatesReturn = React.useMemo(
    () => ({ fromCandidatesPath: `${location.pathname}${location.search}` } satisfies { fromCandidatesPath: string }),
    [location.pathname, location.search],
  );

  const id = row?.id;
  const detailQ = useQuery({
    queryKey: ['admin-venue-detail', id],
    queryFn: () => fetchAdminVenueDetail(id!),
    enabled: open && Boolean(id),
  });
  const similarQ = useQuery({
    queryKey: ['venue-similar-drafts', id, 'drawer'],
    queryFn: () => fetchSimilarDrafts(id!),
    enabled: open && Boolean(id),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose
        className="fixed left-auto right-0 top-0 z-50 flex h-full max-h-none max-w-xl translate-x-0 translate-y-0 flex-col gap-0 overflow-y-auto rounded-none border-l p-6 sm:rounded-none"
      >
        <DialogHeader className="text-left">
          <DialogTitle>Кандидат площадки</DialogTitle>
          <DialogDescription>Импорт и сигналы совпадения</DialogDescription>
        </DialogHeader>

        {detailQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        ) : detailQ.isError ? (
          <p className="text-sm text-rose-600">{detailQ.error instanceof Error ? detailQ.error.message : 'Ошибка'}</p>
        ) : detailQ.data ? (
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-lg font-semibold">{detailQ.data.title}</div>
              {row?.mergeTargetId ? (
                <div className="mt-2 text-sm">
                  <Link
                    to={`/admin-v3/venues/${row.mergeTargetId}`}
                    state={candidatesReturn}
                    className="text-primary underline"
                  >
                    Каноническая площадка (merge target)
                  </Link>
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <LifecycleStatusBadge status={detailQ.data.lifecycleStatus} />
                <SourceTypeBadge t={detailQ.data.sourceType} />
                <ImportSourceBadge s={detailQ.data.importSource} />
                <ReviewBadge needsReview={detailQ.data.needsReview} />
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs font-medium text-muted-foreground">Сырые поля</div>
              <div>rawName: {detailQ.data.rawName ?? '—'}</div>
              <div>rawAddress: {detailQ.data.rawAddress ?? '—'}</div>
            </div>
            <div className="rounded-md border p-3 font-mono text-xs">
              <div className="font-medium text-foreground">Нормализация</div>
              <div>{detailQ.data.normalizedName ?? '—'}</div>
              <div>{detailQ.data.normalizedAddress ?? '—'}</div>
            </div>
            <div>
              Город: {detailQ.data.city.name} ({detailQ.data.city.slug})
            </div>
            <div>externalVenueId: {detailQ.data.externalVenueId ?? '—'}</div>
            <div>version: {detailQ.data.version}</div>
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Похожие</div>
              {similarQ.isLoading ? (
                <p className="text-xs text-muted-foreground">Загрузка…</p>
              ) : (
                <SimilarVenueList
                  items={similarQ.data?.items ?? []}
                  selectedId={null}
                  readOnly
                  linkCanonicalVenues
                />
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 border-t pt-4">
          <Button type="button" onClick={onApprove}>
            Утвердить
          </Button>
          <Button type="button" variant="outline" onClick={onMerge}>
            Слить
          </Button>
          <Button type="button" variant="destructive" onClick={onReject}>
            Отклонить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
