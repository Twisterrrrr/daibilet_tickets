import * as React from 'react';

import { DataTableShell, EmptyState } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createLandingBlock, deleteLandingBlock, patchLandingBlock, reorderLandingBlocks } from '@/modules/landings/api/landings';
import { LayoutTemplate } from 'lucide-react';

export type LandingBlockRow = {
  id: string;
  type?: string | null;
  variant?: string | null;
  title?: string | null;
  sortOrder?: number | null;
  isEnabled?: boolean | null;
};

export type LandingContentBlocksTabProps = {
  landingId: string;
  blocks: LandingBlockRow[];
  onReload: () => void;
};

export function LandingContentBlocksTab(props: LandingContentBlocksTabProps) {
  const rows = props.blocks ?? [];
  const empty = rows.length === 0;

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createType, setCreateType] = React.useState('HERO');
  const [createTitle, setCreateTitle] = React.useState('');
  const [createVariant, setCreateVariant] = React.useState('');
  const [createBody, setCreateBody] = React.useState('');
  const [createEnabled, setCreateEnabled] = React.useState(true);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [editVariant, setEditVariant] = React.useState('');
  const [editBody, setEditBody] = React.useState('');
  const [editEnabled, setEditEnabled] = React.useState(true);

  const sorted = React.useMemo(() => {
    return [...rows].sort((a, b) => {
      const ao = a.sortOrder ?? 0;
      const bo = b.sortOrder ?? 0;
      if (ao !== bo) return ao - bo;
      return a.id.localeCompare(b.id);
    });
  }, [rows]);

  const orderedIds = React.useMemo(() => sorted.map((b) => b.id), [sorted]);

  const startEdit = (b: LandingBlockRow) => {
    setEditingId(b.id);
    setEditTitle(b.title ?? '');
    setEditVariant(b.variant ?? '');
    setEditBody('');
    setEditEnabled(b.isEnabled !== false);
  };

  const blockTypeOptions = [
    'HERO',
    'TRUST_BADGES',
    'VALUE_PROPS',
    'QUICK_FILTERS',
    'FEATURED_VARIANTS',
    'SCHEDULE_PREVIEW',
    'CITY_GRID',
    'CATEGORY_CHIPS',
    'INFO_ICONS',
    'STORY',
    'HIGHLIGHTS',
    'ITINERARY',
    'PRICING',
    'FAQ',
    'REVIEWS',
    'GALLERY',
    'COMPARISON',
    'RELATED_LANDINGS',
    'RELATED_COLLECTIONS',
    'RELATED_ARTICLES',
    'CTA_BANNER',
    'SEO_TEXT',
    'RAW_RICH_TEXT',
  ] as const;

  return (
    <Card className="border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Контент-блоки</div>
      <div className="mt-1 text-xs text-muted-foreground">
            CRUD через <span className="font-mono">/admin/landings/:id/blocks*</span>. После изменений список перезагружается.
      </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setCreateOpen((v) => !v)}>
            {createOpen ? 'Скрыть' : 'Добавить блок'}
          </Button>
        </div>
      </div>

      {err ? <div className="mt-3 text-sm text-destructive">{err}</div> : null}

      {createOpen ? (
        <div className="mt-3 rounded-md border border-border bg-secondary/10 p-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">type</div>
              <select
                className="border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={createType}
                onChange={(e) => setCreateType(e.target.value)}
              >
                {blockTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">variant</div>
              <Input value={createVariant} onChange={(e) => setCreateVariant(e.target.value)} className="h-9 font-mono" />
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <div className="text-xs font-medium text-muted-foreground">title</div>
              <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <div className="text-xs font-medium text-muted-foreground">body</div>
              <Textarea value={createBody} onChange={(e) => setCreateBody(e.target.value)} className="min-h-[80px]" />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={createEnabled} onChange={(e) => setCreateEnabled(e.target.checked)} />
              isEnabled
            </label>
            <div className="flex items-center justify-end gap-2 lg:col-span-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setCreateTitle('');
                  setCreateVariant('');
                  setCreateBody('');
                  setCreateEnabled(true);
                }}
              >
                Очистить
              </Button>
              <Button
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setErr('');
                  setBusy(true);
                  try {
                    await createLandingBlock(props.landingId, {
                      type: createType,
                      variant: createVariant.trim() ? createVariant.trim() : null,
                      title: createTitle.trim() ? createTitle.trim() : null,
                      body: createBody.trim() ? createBody.trim() : null,
                      isEnabled: createEnabled,
                    });
                    setCreateTitle('');
                    setCreateVariant('');
                    setCreateBody('');
                    setCreateEnabled(true);
                    props.onReload();
                  } catch (e: unknown) {
                    setErr(e instanceof Error ? e.message : 'Не удалось создать блок');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Добавить
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3">
        <DataTableShell
          columns={['#', 'Тип', 'Заголовок', 'Вариант', 'Вкл.', 'Действия']}
          loading={false}
          empty={empty ? <EmptyState icon={LayoutTemplate} title="Блоков нет" description="Создайте блоки и проверьте вкладку «Подбор»." /> : null}
        >
          {sorted.map((b, idx) => (
            <tr key={b.id} className="border-b border-border/60 hover:bg-secondary/40">
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{b.sortOrder ?? idx}</td>
              <td className="px-4 py-3 text-sm">
                <Badge variant="outline" className="border-border font-normal font-mono text-xs">
                  {b.type ?? '—'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-foreground">{b.title?.trim() ? b.title : '—'}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{b.variant ?? '—'}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{b.isEnabled === false ? 'off' : 'on'}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={busy || idx === 0}
                    onClick={async () => {
                      setErr('');
                      setBusy(true);
                      try {
                        const next = [...orderedIds];
                        const i = next.indexOf(b.id);
                        if (i > 0) {
                          const tmp = next[i - 1];
                          next[i - 1] = next[i];
                          next[i] = tmp;
                          await reorderLandingBlocks(props.landingId, next);
                          props.onReload();
                        }
                      } catch (e: unknown) {
                        setErr(e instanceof Error ? e.message : 'Не удалось поменять порядок');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={busy || idx === sorted.length - 1}
                    onClick={async () => {
                      setErr('');
                      setBusy(true);
                      try {
                        const next = [...orderedIds];
                        const i = next.indexOf(b.id);
                        if (i >= 0 && i < next.length - 1) {
                          const tmp = next[i + 1];
                          next[i + 1] = next[i];
                          next[i] = tmp;
                          await reorderLandingBlocks(props.landingId, next);
                          props.onReload();
                        }
                      } catch (e: unknown) {
                        setErr(e instanceof Error ? e.message : 'Не удалось поменять порядок');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={busy}
                    onClick={() => {
                      setErr('');
                      startEdit(b);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={busy}
                    onClick={async () => {
                      setErr('');
                      setBusy(true);
                      try {
                        await patchLandingBlock(props.landingId, b.id, { isEnabled: b.isEnabled === false });
                        props.onReload();
                      } catch (e: unknown) {
                        setErr(e instanceof Error ? e.message : 'Не удалось переключить');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {b.isEnabled === false ? 'On' : 'Off'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={busy}
                    onClick={async () => {
                      setErr('');
                      setBusy(true);
                      try {
                        await deleteLandingBlock(props.landingId, b.id);
                        props.onReload();
                      } catch (e: unknown) {
                        setErr(e instanceof Error ? e.message : 'Не удалось удалить');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </DataTableShell>
      </div>

      {editingId ? (
        <div className="mt-4 rounded-md border border-border bg-secondary/10 p-3">
          <div className="text-sm font-semibold">Редактирование блока</div>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">title</div>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">variant</div>
              <Input value={editVariant} onChange={(e) => setEditVariant(e.target.value)} className="h-9 font-mono" />
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <div className="text-xs font-medium text-muted-foreground">body</div>
              <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="min-h-[90px]" placeholder="Если оставить пустым — body не меняем" />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={editEnabled} onChange={(e) => setEditEnabled(e.target.checked)} />
              isEnabled
            </label>
            <div className="flex items-center justify-end gap-2 lg:col-span-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditingId(null)}>
                Закрыть
              </Button>
              <Button
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setErr('');
                  setBusy(true);
                  try {
                    await patchLandingBlock(props.landingId, editingId, {
                      title: editTitle.trim() ? editTitle.trim() : null,
                      variant: editVariant.trim() ? editVariant.trim() : null,
                      ...(editBody.trim().length ? { body: editBody.trim() } : {}),
                      isEnabled: editEnabled,
                    });
                    setEditingId(null);
                    props.onReload();
                  } catch (e: unknown) {
                    setErr(e instanceof Error ? e.message : 'Не удалось сохранить блок');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
