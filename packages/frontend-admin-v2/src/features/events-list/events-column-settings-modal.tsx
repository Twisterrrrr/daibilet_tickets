import { GripVertical, X } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import { Button } from '@/shared/ui/button';
import { SearchInput } from '@/shared/ui/search-input';

import {
  EVENT_TABLE_COLUMN_IDS,
  EVENT_TABLE_COLUMN_LABELS,
  EVENT_TABLE_COLUMN_REQUIRED,
  type EventTableColumnId,
} from './events-table-columns';

export function EventsColumnSettingsModal({
  open,
  initialOrder,
  onClose,
  onApply,
}: {
  open: boolean;
  initialOrder: EventTableColumnId[];
  onClose: () => void;
  onApply: (order: EventTableColumnId[]) => void;
}) {
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-text-primary/20 backdrop-blur-[1px]"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(90vh,640px)] w-full max-w-3xl flex-col overflow-hidden rounded-card border border-border-soft bg-surface shadow-soft"
      >
        <div className="border-b border-border-soft px-5 py-4">
          <h2 id={titleId} className="text-section text-text-primary">
            Настройка столбцов
          </h2>
          <p className="mt-1 text-small text-text-secondary">
            Выберите поля и порядок колонок в таблице событий. Настройка сохраняется в этом браузере.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 sm:grid-cols-2">
          <div className="flex max-h-[420px] flex-col border-border-soft sm:border-r">
            <div className="border-b border-border-soft p-3">
              <SearchInput placeholder="Найти столбец…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
              {filteredCatalog.map((id) => {
                const checked = visibleSet.has(id);
                const disabled = id === EVENT_TABLE_COLUMN_REQUIRED;
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-2 hover:bg-surface-alt/80">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border-soft text-accent focus:ring-accent/30"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(id)}
                      />
                      <span className="text-small text-text-primary">{EVENT_TABLE_COLUMN_LABELS[id]}</span>
                      {disabled ? (
                        <span className="text-[0.65rem] text-text-muted">обязательно</span>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex max-h-[420px] flex-col">
            <div className="border-b border-border-soft px-3 py-3">
              <p className="text-label font-medium text-text-primary">Столбцы в таблице</p>
              <p className="text-[0.6875rem] text-text-muted">Перетащите или пользуйтесь порядком слева направо</p>
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
                  className={`flex items-center gap-2 rounded-control border border-transparent bg-surface-alt/40 px-2 py-2 ${
                    dragId === id ? 'opacity-60' : ''
                  }`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-text-muted" aria-hidden />
                  <span className="flex-1 text-small font-medium text-text-primary">
                    {EVENT_TABLE_COLUMN_LABELS[id]}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      className="rounded px-1.5 py-1 text-[0.65rem] text-text-muted hover:bg-surface hover:text-text-primary"
                      onClick={() => moveInReport(id, -1)}
                      aria-label="Выше"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rounded px-1.5 py-1 text-[0.65rem] text-text-muted hover:bg-surface hover:text-text-primary"
                      onClick={() => moveInReport(id, 1)}
                      aria-label="Ниже"
                    >
                      ↓
                    </button>
                    {id !== EVENT_TABLE_COLUMN_REQUIRED ? (
                      <button
                        type="button"
                        className="rounded p-1 text-text-muted hover:bg-surface hover:text-danger"
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

        <div className="flex justify-end gap-2 border-t border-border-soft px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отменить
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              onApply(draftOrder);
              onClose();
            }}
          >
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}
