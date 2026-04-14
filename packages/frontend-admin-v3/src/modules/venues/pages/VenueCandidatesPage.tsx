import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { DataTableShell } from '@/components/shared/table/DataTableShell';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/api/client';
import {
  approveVenuesBatch,
  fetchBatchApprovePreview,
  fetchSimilarDraftsBatch,
  fetchVenueCandidates,
  rejectVenuesBatch,
  type AdminVenueCandidateRow,
  type BatchVenueActionResultDto,
  type VenueCandidatesSortPreset,
  type VenueImportSource,
  type VenueModerationReasonCode,
} from '@/modules/venues/api/candidates';
import { ApproveVenueDraftDialog } from '@/modules/venues/components/candidates/ApproveVenueDraftDialog';
import { MergeVenueDialog } from '@/modules/venues/components/candidates/MergeVenueDialog';
import { RejectVenueDialog } from '@/modules/venues/components/candidates/RejectVenueDialog';
import { VenueCandidateDetailsDrawer } from '@/modules/venues/components/candidates/VenueCandidateDetailsDrawer';
import { VenueBatchApprovePreviewDialog } from '@/modules/venues/components/candidates/VenueBatchApprovePreviewDialog';
import {
  VenueBatchActionResultDialog,
  VenueCandidatesBatchConfirmDialog,
} from '@/modules/venues/components/candidates/VenueCandidatesBatchDialogs';
import { VenueCandidatesFilterBar, type CityOption } from '@/modules/venues/components/candidates/VenueCandidatesFilterBar';
import { VenueCandidatesSimilarContextBanner } from '@/modules/venues/components/candidates/VenueCandidatesSimilarContextBanner';
import { VenueCandidatesSelectionBar } from '@/modules/venues/components/candidates/VenueCandidatesSelectionBar';
import { VenueCandidatesTable } from '@/modules/venues/components/candidates/VenueCandidatesTable';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import {
  applySortPresetToState,
  buildVenueCandidatesSearchParams,
  parseVenueCandidatesSearchParams,
  resetVenueCandidatesFiltersKeepingSimilar,
  stripSimilarVenueContext,
  venueCandidatesParsedToSortPreset,
} from '@/modules/venues/utils/venueCandidatesUrlState';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';

export function VenueCandidatesPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const spKey = searchParams.toString();

  const parsed = React.useMemo(() => parseVenueCandidatesSearchParams(new URLSearchParams(spKey)), [spKey]);

  const [searchDraft, setSearchDraft] = React.useState(parsed.search);
  React.useEffect(() => {
    setSearchDraft(parsed.search);
  }, [parsed.search]);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      if (searchDraft.trim() === parsed.search) return;
      const next = { ...parsed, search: searchDraft.trim(), page: 1 };
      setSearchParams(buildVenueCandidatesSearchParams(next), { replace: true });
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchDraft, parsed, setSearchParams]);

  const patchUrl = React.useCallback(
    (next: typeof parsed, nav?: { replace?: boolean }) => {
      setSearchParams(buildVenueCandidatesSearchParams(next), { replace: nav?.replace ?? false });
    },
    [setSearchParams],
  );

  const onCitySlug = (v: string) => {
    patchUrl({ ...parsed, citySlug: v, page: 1 });
  };
  const onImportSource = (v: '' | VenueImportSource) => {
    patchUrl({ ...parsed, importSource: v, page: 1 });
  };
  const onOnlyNeedsReview = (v: boolean) => {
    patchUrl({ ...parsed, onlyNeedsReview: v, page: 1 });
  };
  const onOnlyWithDuplicates = (v: boolean) => {
    patchUrl({ ...parsed, onlyWithDuplicates: v, page: 1 });
  };
  const onSortPreset = (preset: VenueCandidatesSortPreset) => {
    patchUrl(applySortPresetToState(parsed, preset));
  };
  const onResetFilters = () => {
    patchUrl(resetVenueCandidatesFiltersKeepingSimilar(parsed), { replace: true });
  };
  const onResetSimilarContext = () => {
    patchUrl(stripSimilarVenueContext(parsed), { replace: true });
  };

  const [banner, setBanner] = React.useState<string | null>(null);

  const [activeRow, setActiveRow] = React.useState<AdminVenueCandidateRow | null>(null);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [batchApprovePreviewOpen, setBatchApprovePreviewOpen] = React.useState(false);
  const [batchRejectOpen, setBatchRejectOpen] = React.useState(false);
  const [batchRejectReasonCode, setBatchRejectReasonCode] = React.useState<VenueModerationReasonCode | ''>('');
  const [batchRejectReasonText, setBatchRejectReasonText] = React.useState('');
  const [batchResult, setBatchResult] = React.useState<BatchVenueActionResultDto | null>(null);
  const [batchResultOpen, setBatchResultOpen] = React.useState(false);
  const [lastBatchKind, setLastBatchKind] = React.useState<'approve' | 'reject'>('approve');

  const listIdentity = buildVenueCandidatesSearchParams(parsed).toString();
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [listIdentity]);

  const citiesQ = useQuery({
    queryKey: ['admin-cities-options'],
    queryFn: async () => {
      const res = await adminApi.get<{ items: CityOption[] }>('/admin/cities?limit=1000');
      return res.items ?? [];
    },
  });

  const listQ = useQuery({
    queryKey: [
      'venue-candidates',
      parsed.page,
      parsed.limit,
      parsed.search,
      parsed.citySlug,
      parsed.importSource,
      parsed.onlyNeedsReview,
      parsed.sort,
      parsed.order,
      'hints',
    ],
    queryFn: () =>
      fetchVenueCandidates({
        page: parsed.page,
        limit: parsed.limit,
        search: parsed.search || undefined,
        citySlug: parsed.citySlug || undefined,
        importSource: parsed.importSource || undefined,
        needsReview: parsed.onlyNeedsReview ? true : undefined,
        sort: parsed.sort,
        order: parsed.order,
        includeDecisionHints: true,
      }),
  });

  const rows = listQ.data?.items ?? [];
  const rowIdsKey = rows.map((r) => r.id).join(',');

  const similarBatchQ = useQuery({
    queryKey: ['venue-similar-drafts-batch', rowIdsKey],
    queryFn: () =>
      fetchSimilarDraftsBatch(
        rows.map((r) => r.id),
        { limit: 8 },
      ),
    enabled: listQ.isSuccess && rows.length > 0,
    staleTime: 120_000,
  });

  const dupById = React.useMemo(() => {
    const m = new Map<string, boolean | undefined>();
    if (similarBatchQ.isPending || similarBatchQ.isLoading) {
      rows.forEach((r) => m.set(r.id, undefined));
      return m;
    }
    if (similarBatchQ.isError || !similarBatchQ.data) {
      rows.forEach((r) => m.set(r.id, undefined));
      return m;
    }
    const data = similarBatchQ.data;
    for (const r of rows) {
      const items = data[r.id];
      m.set(r.id, Array.isArray(items) ? items.length > 0 : false);
    }
    return m;
  }, [rows, similarBatchQ.data, similarBatchQ.isPending, similarBatchQ.isLoading, similarBatchQ.isError]);

  const dupLoading = similarBatchQ.isFetching;

  const displayRows = React.useMemo(() => {
    if (!parsed.onlyWithDuplicates) return rows;
    return rows.filter((r) => dupById.get(r.id) === true);
  }, [rows, parsed.onlyWithDuplicates, dupById]);

  const duplicateFlags = displayRows.map((r) => dupById.get(r.id));

  const batchEligibleIds = React.useMemo(
    () => new Set(displayRows.filter((r) => r.lifecycleStatus === 'DRAFT').map((r) => r.id)),
    [displayRows],
  );

  const selectedBatchIds = React.useMemo(
    () => [...selectedIds].filter((id) => batchEligibleIds.has(id)),
    [selectedIds, batchEligibleIds],
  );

  const toggleBatchRow = React.useCallback(
    (id: string) => {
      if (!batchEligibleIds.has(id)) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [batchEligibleIds],
  );

  const toggleBatchAll = React.useCallback(() => {
    setSelectedIds((prev) => {
      const eligible = displayRows.filter((r) => r.lifecycleStatus === 'DRAFT').map((r) => r.id);
      const allSelected = eligible.length > 0 && eligible.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        eligible.forEach((id) => next.delete(id));
      } else {
        eligible.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [displayRows]);

  const batchApproveMut = useMutation({
    mutationFn: approveVenuesBatch,
  });

  const batchApprovePreviewMut = useMutation({
    mutationFn: (ids: string[]) => fetchBatchApprovePreview(ids),
  });

  const batchRejectMut = useMutation({
    mutationFn: rejectVenuesBatch,
  });

  const batchBusy =
    batchApproveMut.isPending ||
    batchRejectMut.isPending ||
    batchApprovePreviewMut.isPending;

  const totalPages = Math.max(1, Math.ceil((listQ.data?.total ?? 0) / parsed.limit));

  const sortPresetForBar = venueCandidatesParsedToSortPreset(parsed);

  const openApprove = (row: AdminVenueCandidateRow) => {
    setActiveRow(row);
    setApproveOpen(true);
  };
  const openMerge = (row: AdminVenueCandidateRow) => {
    setActiveRow(row);
    setMergeOpen(true);
  };
  const openReject = (row: AdminVenueCandidateRow) => {
    setActiveRow(row);
    setRejectOpen(true);
  };
  const openDrawer = (row: AdminVenueCandidateRow) => {
    setActiveRow(row);
    setDrawerOpen(true);
  };

  const onMutationDone = () => {
    setBanner('Готово');
    window.setTimeout(() => setBanner(null), 4000);
    void qc.invalidateQueries({ queryKey: ['venue-candidates'] });
    void qc.invalidateQueries({ queryKey: ['venue-similar-drafts-batch'] });
  };

  if (listQ.isLoading) return <LoadingState label="Загрузка кандидатов…" />;
  if (listQ.isError) {
    return (
      <ErrorState
        title="Не удалось загрузить кандидатов"
        description={listQ.error instanceof Error ? listQ.error.message : 'Ошибка'}
        onRetry={() => listQ.refetch()}
      />
    );
  }

  const data = listQ.data;
  if (!data) return <LoadingState label="Загрузка…" />;

  const similarBannerTitle = parsed.similarToVenueName.trim() || parsed.search.trim() || 'площадка';
  const similarCityLine = parsed.citySlug
    ? (citiesQ.data ?? []).find((c) => c.slug === parsed.citySlug)?.name ?? parsed.citySlug
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title="Кандидаты площадок" subtitle={`Импортные DRAFT · всего в выборке: ${data.total}`} />

      {banner ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          {banner}
        </div>
      ) : null}

      {parsed.similarToVenueId ? (
        <VenueCandidatesSimilarContextBanner
          venueTitle={similarBannerTitle}
          cityLine={similarCityLine}
          onReset={onResetSimilarContext}
        />
      ) : null}

      <DataTableShell
        toolbar={
          <VenueCandidatesFilterBar
            searchInput={searchDraft}
            onSearchInput={setSearchDraft}
            cities={citiesQ.data ?? []}
            citySlug={parsed.citySlug}
            onCitySlug={onCitySlug}
            importSource={parsed.importSource}
            onImportSource={onImportSource}
            sortPreset={sortPresetForBar}
            onSortPreset={onSortPreset}
            onlyNeedsReview={parsed.onlyNeedsReview}
            onOnlyNeedsReview={onOnlyNeedsReview}
            onlyWithDuplicates={parsed.onlyWithDuplicates}
            onOnlyWithDuplicates={onOnlyWithDuplicates}
            dupLoading={dupLoading}
            onResetFilters={onResetFilters}
          />
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Стр. {parsed.page} / {totalPages}
            {parsed.onlyWithDuplicates ? (
              <span className="ml-2">· показано после фильтра дублей: {displayRows.length}</span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={parsed.page <= 1}
              onClick={() => patchUrl({ ...parsed, page: parsed.page - 1 })}
            >
              Назад
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={parsed.page >= totalPages}
              onClick={() => patchUrl({ ...parsed, page: parsed.page + 1 })}
            >
              Вперёд
            </Button>
          </div>
        </div>

        <VenueCandidatesSelectionBar
          count={selectedBatchIds.length}
          busy={batchBusy}
          onApprove={() => {
            if (selectedBatchIds.length === 0) return;
            setBatchApprovePreviewOpen(true);
            batchApprovePreviewMut.mutate(selectedBatchIds, {
              onError: (e) => {
                const d = getAdminErrorDisplay(e);
                setBanner(`${d.title}${d.description ? `\n${d.description}` : ''}`);
                setBatchApprovePreviewOpen(false);
              },
            });
          }}
          onReject={() => setBatchRejectOpen(true)}
          onClear={() => setSelectedIds(new Set())}
        />

        <VenueCandidatesTable
          items={displayRows}
          duplicateFlags={duplicateFlags}
          onApprove={openApprove}
          onMerge={openMerge}
          onReject={openReject}
          onDetails={openDrawer}
          selection={{
            eligibleIds: batchEligibleIds,
            selectedIds,
            onToggleRow: toggleBatchRow,
            onToggleAll: toggleBatchAll,
          }}
        />
      </DataTableShell>

      <ApproveVenueDraftDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        row={activeRow}
        onSuccess={onMutationDone}
      />
      <MergeVenueDialog open={mergeOpen} onOpenChange={setMergeOpen} row={activeRow} onSuccess={onMutationDone} />
      <RejectVenueDialog open={rejectOpen} onOpenChange={setRejectOpen} row={activeRow} onSuccess={onMutationDone} />
      <VenueCandidateDetailsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        row={activeRow}
        onApprove={() => {
          setDrawerOpen(false);
          if (activeRow) openApprove(activeRow);
        }}
        onMerge={() => {
          setDrawerOpen(false);
          if (activeRow) openMerge(activeRow);
        }}
        onReject={() => {
          setDrawerOpen(false);
          if (activeRow) openReject(activeRow);
        }}
      />

      <VenueBatchApprovePreviewDialog
        open={batchApprovePreviewOpen}
        onOpenChange={(v) => {
          if (!v) {
            setBatchApprovePreviewOpen(false);
            batchApprovePreviewMut.reset();
          }
        }}
        preview={batchApprovePreviewMut.data ?? null}
        loading={batchApprovePreviewMut.isPending}
        confirmLoading={batchApproveMut.isPending}
        onConfirm={() => {
          const preview = batchApprovePreviewMut.data;
          if (!preview || selectedBatchIds.length === 0) return;
          const rowById = new Map(displayRows.map((r) => [r.id, r]));
          const items = preview.items
            .filter((i) => i.status === 'OK' || i.status === 'WARNING')
            .map((i) => ({
              id: i.venueId,
              expectedUpdatedAt: rowById.get(i.venueId)?.updatedAt ?? i.currentUpdatedAt,
            }));
          if (items.length === 0) return;
          batchApproveMut.mutate(
            { items },
            {
              onSuccess: (res) => {
                setBatchApprovePreviewOpen(false);
                batchApprovePreviewMut.reset();
                setLastBatchKind('approve');
                setBatchResult(res);
                setBatchResultOpen(true);
                setSelectedIds(new Set());
                void qc.invalidateQueries({ queryKey: ['venue-candidates'] });
                void qc.invalidateQueries({ queryKey: ['venue-similar-drafts-batch'] });
              },
              onError: (e) => {
                const d = getAdminErrorDisplay(e);
                setBanner(`${d.title}${d.description ? `\n${d.description}` : ''}`);
              },
            },
          );
        }}
      />

      <VenueCandidatesBatchConfirmDialog
        open={batchRejectOpen}
        onOpenChange={(v) => {
          if (!v) {
            setBatchRejectOpen(false);
            setBatchRejectReasonCode('');
            setBatchRejectReasonText('');
          }
        }}
        count={selectedBatchIds.length}
        loading={batchRejectMut.isPending}
        reasonCode={batchRejectReasonCode}
        onReasonCodeChange={setBatchRejectReasonCode}
        reasonText={batchRejectReasonText}
        onReasonTextChange={setBatchRejectReasonText}
        onConfirm={() => {
          if (selectedBatchIds.length === 0) return;
          const rowById = new Map(displayRows.map((r) => [r.id, r]));
          const items = selectedBatchIds.map((id) => ({
            id,
            expectedUpdatedAt: rowById.get(id)?.updatedAt,
          }));
          batchRejectMut.mutate(
            {
              items,
              reasonCode: batchRejectReasonCode || null,
              reasonText: batchRejectReasonText.trim() || null,
            },
            {
              onSuccess: (res) => {
                setBatchRejectOpen(false);
                setBatchRejectReasonCode('');
                setBatchRejectReasonText('');
                setLastBatchKind('reject');
                setBatchResult(res);
                setBatchResultOpen(true);
                setSelectedIds(new Set());
                void qc.invalidateQueries({ queryKey: ['venue-candidates'] });
                void qc.invalidateQueries({ queryKey: ['venue-similar-drafts-batch'] });
              },
              onError: (e) => {
                const d = getAdminErrorDisplay(e);
                setBanner(`${d.title}${d.description ? `\n${d.description}` : ''}`);
              },
            },
          );
        }}
      />

      <VenueBatchActionResultDialog
        open={batchResultOpen && batchResult !== null}
        onOpenChange={(v) => {
          setBatchResultOpen(v);
          if (!v) setBatchResult(null);
        }}
        result={batchResult}
        actionLabel={lastBatchKind === 'approve' ? 'пакетное подтверждение' : 'пакетный отказ'}
      />
    </div>
  );
}
