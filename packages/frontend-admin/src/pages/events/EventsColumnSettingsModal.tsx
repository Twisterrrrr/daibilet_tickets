import { GripVertical, X } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';

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
  EVENT_TABLE_COLUMN_IDS,
  EVENT_TABLE_COLUMN_LABELS,
  EVENT_TABLE_COLUMN_REQUIRED,
  type EventTableColumnId,
} from './events-table-columns';

export function EventsColumnSettingsModal({
  ...props
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialOrder: EventTableColumnId[];
  onApply: (order: EventTableColumnId[]) => void;
}) {
  const { open, onOpenChange, initialOrder, onApply } = props;
  const titleId = useId();
  const [q, setQ] = useState('');
  const [draftOrder, setDraftOrder] = useState<EventTableColumnId[]>(initialOrder);
  const [dragId, setDragId] = useState<EventTableColumnId | null>(null);

  useEffect(() => {
    if (open) setDraftOrder(initialOrder);
  }, [open, initialOrder]);

  const visibleSet = useMemo(() => new Set(draftOrder), [draftOrder]);

  const filteredCatalog = useMemo(() => {
    const n = q.trim().toLowerCase();
    return EVENT_TABLE_COLUMN_IDS.filter((id) => {
      if (!n) return true;
      return EVENT_TABLE_COLUMN_LABELS[id].toLowerCase().includes(n);
    });
  }, [q]);

  const toggle = useCallback((id: EventTableColumnId) => {
    if (id === EVENT_TABLE_COLUMN_REQUIRED) return;
    setDraftOrder((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next.length ? next : [EVENT_TABLE_COLUMN_REQUIRED];
      }
      return [...prev, id];
    });
  }, []);

  const removeFromReport = useCallback((id: EventTableColumnId) => {
    if (id === EVENT_TABLE_COLUMN_REQUIRED) return;
    setDraftOrder((prev) => prev.filter((x) => x !== id));
  }, []);

  const moveInReport = useCallback((id: EventTableColumnId, dir: -1 | 1) => {
    setDraftOrder((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const onDragStart = (id: EventTableColumnId) => setDragId(id);
  const onDragEnd = () => setDragId(null);
  const onDropOn = (targetId: EventTableColumnId) => {
    if (!dragId || dragId === targetId) return;
    setDraftOrder((prev) => {
      const from = prev.indexOf(dragId);
      const to = prev.indexOf(targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      return next;
    });
    setDragId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,640px)] w-full max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        aria-labelledby={titleId}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle id={titleId}>Настройка столбцов</DialogTitle>
          <DialogDescription>
            Выберите поля и порядок колонок в таблице событий. Настройка сохраняется в этом браузере.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 sm:grid-cols-2">
          <div className="flex max-h-[420px] flex-col border-b sm:border-b-0 sm:border-r">
            <div className="border-b p-3">
              <Input placeholder="Найти столбец…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
              {filteredCatalog.map((id) => {
                const checked = visibleSet.has(id);
                const disabled = id === EVENT_TABLE_COLUMN_REQUIRED;
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(id)}
                      />
                      <span className="text-sm">{EVENT_TABLE_COLUMN_LABELS[id]}</span>
                      {disabled ? <span className="text-[0.65rem] text-muted-foreground">обязательно</span> : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex max-h-[420px] flex-col">
            <div className="border-b px-3 py-3">
              <p className="text-xs font-medium">Столбцы в таблице</p>
              <p className="text-[0.6875rem] text-muted-foreground">Перетащите или пользуйтесь порядком слева направо</p>
            </div>
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
              {draftOrder.map((id) => (
                <li
                  key={id}
                  draggable
                  onDragStart={() => onDragStart(id)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropOn(id)}
                  className={`flex items-center gap-2 rounded-md border border-transparent bg-muted/30 px-2 py-2 ${
                    dragId === id ? 'opacity-60' : ''
                  }`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
                  <span className="flex-1 text-sm font-medium">{EVENT_TABLE_COLUMN_LABELS[id]}</span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      className="rounded px-1.5 py-1 text-[0.65rem] text-muted-foreground hover:bg-background hover:text-foreground"
                      onClick={() => moveInReport(id, -1)}
                      aria-label="Выше"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rounded px-1.5 py-1 text-[0.65rem] text-muted-foreground hover:bg-background hover:text-foreground"
                      onClick={() => moveInReport(id, 1)}
                      aria-label="Ниже"
                    >
                      ↓
                    </button>
                    {id !== EVENT_TABLE_COLUMN_REQUIRED ? (
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                        aria-label={`Убрать ${EVENT_TABLE_COLUMN_LABELS[id]}`}
                        onClick={() => removeFromReport(id)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="border-t px-5 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отменить
          </Button>
          <Button
            type="button"
            onClick={() => {
              onApply(draftOrder);
              onOpenChange(false);
            }}
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
