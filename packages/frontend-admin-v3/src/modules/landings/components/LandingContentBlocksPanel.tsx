import { Button } from '@/components/ui/button';
import { getAdminErrorDisplay } from '@/lib/get-admin-error-message';
import {
  ADMIN_LANDING_BLOCK_TYPES,
  deleteAdminLandingBlock,
  patchAdminLandingBlock,
  postAdminLandingBlock,
  postAdminLandingBlockReorder,
  type AdminLandingContentBlock,
  type AdminLandingBlockType,
} from '@/modules/landings/api/landings';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

type Props = {
  landingId: string;
  blocks: AdminLandingContentBlock[];
};

export function LandingContentBlocksPanel({ landingId, blocks }: Props) {
  const qc = useQueryClient();
  const [banner, setBanner] = React.useState<string | null>(null);
  const [addType, setAddType] = React.useState<AdminLandingBlockType>('STORY');
  const [addTitle, setAddTitle] = React.useState('');
  const [addBody, setAddBody] = React.useState('');

  const sorted = React.useMemo(() => [...blocks].sort((a, b) => a.sortOrder - b.sortOrder), [blocks]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['admin-landing-detail', landingId] });
    await qc.invalidateQueries({ queryKey: ['admin-landing-seo-audit', landingId] });
  };

  const reorderM = useMutation({
    mutationFn: async (orderedIds: string[]) => postAdminLandingBlockReorder(landingId, orderedIds),
    onSuccess: async () => {
      setBanner(null);
      await invalidate();
    },
    onError: (e: unknown) => {
      const d = getAdminErrorDisplay(e);
      setBanner(`${d.title}${d.description ? `\n${d.description}` : ''}`);
    },
  });

  const createM = useMutation({
    mutationFn: async () =>
      postAdminLandingBlock(landingId, {
        type: addType,
        title: addTitle.trim() || null,
        body: addBody.trim() || null,
      }),
    onSuccess: async () => {
      setAddTitle('');
      setAddBody('');
      setBanner('Блок добавлен');
      window.setTimeout(() => setBanner(null), 2500);
      await invalidate();
    },
    onError: (e: unknown) => {
      const d = getAdminErrorDisplay(e);
      setBanner(`${d.title}${d.description ? `\n${d.description}` : ''}`);
    },
  });

  const deleteM = useMutation({
    mutationFn: async (blockId: string) => deleteAdminLandingBlock(landingId, blockId),
    onSuccess: async () => invalidate(),
    onError: (e: unknown) => {
      const d = getAdminErrorDisplay(e);
      setBanner(`${d.title}${d.description ? `\n${d.description}` : ''}`);
    },
  });

  const toggleM = useMutation({
    mutationFn: async (b: AdminLandingContentBlock) =>
      patchAdminLandingBlock(landingId, b.id, { isEnabled: !b.isEnabled }),
    onSuccess: async () => invalidate(),
    onError: (e: unknown) => {
      const d = getAdminErrorDisplay(e);
      setBanner(`${d.title}${d.description ? `\n${d.description}` : ''}`);
    },
  });

  const move = (blockId: string, dir: -1 | 1) => {
    const idx = sorted.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= sorted.length) return;
    const next = [...sorted];
    const t = next[idx]!;
    next[idx] = next[j]!;
    next[j] = t;
    reorderM.mutate(next.map((b) => b.id));
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">Композиция страницы</div>
          <div className="text-xs text-muted-foreground">
            Управляемые блоки (не источник выборки). Публичный сайт рендерит включённые блоки по порядку.
          </div>
        </div>
      </div>

      {banner ? (
        <div className="whitespace-pre-wrap rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30">
          {banner}
        </div>
      ) : null}

      <div className="rounded-md border bg-muted/20 p-4 space-y-3">
        <div className="text-sm font-medium">Добавить блок</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Тип
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={addType}
              onChange={(e) => setAddType(e.target.value as AdminLandingBlockType)}
            >
              {ADMIN_LANDING_BLOCK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Заголовок (опционально)
            <input
              className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Текст / body (опционально)
          <textarea
            className="min-h-[80px] rounded-md border bg-background px-2 py-2 text-sm text-foreground"
            value={addBody}
            onChange={(e) => setAddBody(e.target.value)}
          />
        </label>
        <div className="flex items-center gap-2">
          <Button type="button" disabled={createM.isPending} onClick={() => createM.mutate()}>
            Добавить
          </Button>
          {createM.isError ? <div className="text-sm text-rose-700">Ошибка создания</div> : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Порядок</th>
              <th className="px-3 py-2 text-left font-medium">Тип</th>
              <th className="px-3 py-2 text-left font-medium">Заголовок</th>
              <th className="px-3 py-2 text-left font-medium">Вкл</th>
              <th className="px-3 py-2 text-right font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  Блоков пока нет
                </td>
              </tr>
            ) : (
              sorted.map((b) => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      <Button type="button" variant="outline" size="sm" disabled={reorderM.isPending} onClick={() => move(b.id, -1)}>
                        ↑
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={reorderM.isPending} onClick={() => move(b.id, 1)}>
                        ↓
                      </Button>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-xs">{b.type}</td>
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium">{b.title ?? '—'}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{b.body ?? ''}</div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      checked={Boolean(b.isEnabled)}
                      disabled={toggleM.isPending}
                      onChange={() => toggleM.mutate(b)}
                    />
                  </td>
                  <td className="px-3 py-2 align-top text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deleteM.isPending}
                      onClick={() => {
                        if (!window.confirm('Удалить блок?')) return;
                        deleteM.mutate(b.id);
                      }}
                    >
                      Удалить
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground">
        Расширенное редактирование (payload, richTextJson) — через API или будущий редактор. Сейчас: тип, заголовок, body,
        порядок, флаг «вкл».
      </div>
    </div>
  );
}
