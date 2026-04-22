import { ErrorState } from '@/components/shared/states/ErrorState';
import { LoadingState } from '@/components/shared/states/LoadingState';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import { deleteAdminTag, fetchAdminTag, patchAdminTag, unlinkTagFromEvents, type AdminTagListItem } from '@/modules/tags/api/tags';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';

const TAG_CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'THEME', label: 'Тема (THEME)' },
  { value: 'AUDIENCE', label: 'Аудитория (AUDIENCE)' },
  { value: 'SEASON', label: 'Сезон (SEASON)' },
  { value: 'SPECIAL', label: 'Спец. (SPECIAL)' },
];

export function TagDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['admin-tag-detail', id],
    queryFn: () => fetchAdminTag(id!),
    enabled: Boolean(id),
  });

  const [draft, setDraft] = React.useState<AdminTagListItem | null>(null);
  React.useEffect(() => {
    if (q.data) setDraft(q.data);
  }, [q.data]);

  const saveM = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Нет данных');
      return patchAdminTag(draft.id, {
        name: draft.name,
        slug: draft.slug,
        category: draft.category,
        tagKind: draft.tagKind,
        structuralGroup: draft.structuralGroup,
        description: (draft as any).description ?? undefined,
        metaTitle: (draft as any).metaTitle ?? undefined,
        metaDescription: (draft as any).metaDescription ?? undefined,
        heroImage: (draft as any).heroImage ?? undefined,
        isActive: draft.isActive,
        isFeatured: draft.isFeatured,
        sortOrder: draft.sortOrder,
        version: draft.version,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-tag-detail', id] });
      await qc.invalidateQueries({ queryKey: ['admin-tags-list'] });
    },
  });

  const unlinkM = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Нет данных');
      return unlinkTagFromEvents(draft.slug);
    },
  });

  const deleteM = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Нет данных');
      return deleteAdminTag(draft.id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-tags-list'] });
    },
  });

  if (!id) return <ErrorState title="Некорректный ID" description="Не указан идентификатор тега." />;
  if (q.isLoading) return <LoadingState label="Загрузка тега…" />;
  if (q.isError || !draft) {
    const meta = q.error ? getAdminErrorDisplay(q.error) : null;
    return (
      <ErrorState
        title="Не удалось загрузить тег"
        description={meta?.title ?? 'Ошибка'}
        onRetry={() => q.refetch()}
      />
    );
  }

  const v = draft;
  const errSave = saveM.error ? getAdminErrorDisplay(saveM.error) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={v.name}
        subtitle={`Тег · ${v.slug}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin-v3/tags">К списку</Link>
            </Button>
            <Button type="button" onClick={() => saveM.mutate()} disabled={saveM.isPending}>
              {saveM.isPending ? 'Сохранение…' : 'Сохранить'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteM.isPending}
              onClick={() => {
                if (!confirm(`Удалить тег "${v.slug}"?`)) return;
                deleteM.mutate();
              }}
            >
              Удалить
            </Button>
          </div>
        }
      />

      {errSave ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errSave.title}
        </div>
      ) : null}

      <section className="rounded-lg border bg-card p-5 text-sm space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Название</span>
            <Input value={v.name} onChange={(e) => setDraft({ ...v, name: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Slug</span>
            <Input value={v.slug} onChange={(e) => setDraft({ ...v, slug: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Категория</span>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={v.category}
              onChange={(e) => setDraft({ ...v, category: e.target.value })}
            >
              {TAG_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Вид тега</span>
            <Input value={v.tagKind ?? ''} onChange={(e) => setDraft({ ...v, tagKind: e.target.value || null })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Структурная группа</span>
            <Input
              value={v.structuralGroup ?? ''}
              onChange={(e) => setDraft({ ...v, structuralGroup: e.target.value || null })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(v.isActive)} onChange={(e) => setDraft({ ...v, isActive: e.target.checked })} />
            Активен
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(v.isFeatured)} onChange={(e) => setDraft({ ...v, isFeatured: e.target.checked })} />
            В избранном
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Порядок</span>
            <Input
              type="number"
              value={String(v.sortOrder ?? 0)}
              onChange={(e) => setDraft({ ...v, sortOrder: Number(e.target.value) })}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">v{v.version}</Badge>
            <Badge variant="outline">{v.isActive ? 'активен' : 'выкл'}</Badge>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="text-xs font-medium text-muted-foreground">Операции</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={unlinkM.isPending}
              onClick={() => {
                if (!confirm(`Отвязать тег "${v.slug}" от всех событий?`)) return;
                unlinkM.mutate();
              }}
            >
              {unlinkM.isPending ? '…' : 'Отвязать от событий'}
            </Button>
          </div>
          {unlinkM.data ? (
            <div className="mt-2 text-xs text-muted-foreground">
              Удалено связей: {unlinkM.data.deleted}
              {unlinkM.data.message ? ` · ${unlinkM.data.message}` : ''}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

