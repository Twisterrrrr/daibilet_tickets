import { useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { MediaImageItem, MediaImageUploadResult } from '@daibilet/shared';

import { ImageDropzone } from './ImageDropzone';

function mapUploadToItem(r: MediaImageUploadResult, sortOrder: number): MediaImageItem {
  return {
    id: `mi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    url: r.url,
    publicId: r.publicId,
    width: r.width,
    height: r.height,
    bytes: r.bytes,
    originalFilename: r.originalFilename,
    sortOrder,
    status: 'uploaded',
  };
}

export type ImageGalleryManagerProps = {
  items: MediaImageItem[];
  onChange: (next: MediaImageItem[]) => void;
  uploadFiles: (files: File[]) => Promise<MediaImageUploadResult[]>;
  deleteByPublicIds?: (publicIds: string[]) => Promise<void>;
  maxImages?: number;
  disabled?: boolean;
  title?: string;
  description?: string;
  allowPrimary?: boolean;
};

function SortableRow({
  item,
  disabled,
  allowPrimary,
  isPrimary,
  onRemove,
  onPrimary,
}: {
  item: MediaImageItem;
  disabled?: boolean;
  allowPrimary?: boolean;
  isPrimary: boolean;
  onRemove: () => void;
  onPrimary: () => void;
}) {
  const id = item.id ?? item.url;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100"
        {...attributes}
        {...listeners}
        aria-label="Переместить"
      >
        <span className="text-xs">⋮⋮</span>
      </button>
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-slate-100">
        {item.url ? (
          <img src={item.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-slate-400">…</div>
        )}
      </div>
      <div className="min-w-0 flex-1 truncate text-[11px] text-slate-600">{item.originalFilename || item.url}</div>
      {allowPrimary && (
        <button
          type="button"
          disabled={disabled}
          onClick={onPrimary}
          className={`shrink-0 rounded px-2 py-1 text-[11px] font-medium ${
            isPrimary ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {isPrimary ? 'Главная' : 'Сделать главной'}
        </button>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        className="shrink-0 rounded px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
      >
        Удалить
      </button>
    </div>
  );
}

export function ImageGalleryManager({
  items,
  onChange,
  uploadFiles,
  deleteByPublicIds,
  maxImages = 30,
  disabled,
  title = 'Галерея',
  description,
  allowPrimary = false,
}: ImageGalleryManagerProps) {
  const [dropError, setDropError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = useMemo(() => items.map((i) => i.id ?? i.url), [items]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  };

  const removeAt = useCallback(
    async (index: number) => {
      const item = items[index];
      if (item?.publicId && deleteByPublicIds) {
        try {
          await deleteByPublicIds([item.publicId]);
        } catch {
          /* удаляем из сущности в любом случае */
        }
      }
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange, deleteByPublicIds],
  );

  const setPrimaryAt = (index: number) => {
    if (!allowPrimary) return;
    const next = items.map((it, i) => ({ ...it, isPrimary: i === index }));
    onChange(next);
  };

  const onDropFiles = async (files: File[]) => {
    setDropError(null);
    if (!files.length) return;
    const room = maxImages - items.length;
    if (room <= 0) {
      setDropError(`Достигнут лимит изображений (${maxImages})`);
      return;
    }
    const slice = files.slice(0, room);
    setBusy(true);
    try {
      const uploaded = await uploadFiles(slice);
      const start = items.length;
      const appended = uploaded.map((r, i) => mapUploadToItem(r, start + i));
      onChange([...items, ...appended]);
    } catch (e) {
      setDropError(e instanceof Error ? e.message : 'Не удалось загрузить');
    } finally {
      setBusy(false);
    }
  };

  const primaryIndex = allowPrimary ? items.findIndex((x) => x.isPrimary) : -1;

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>

      <ImageDropzone
        onFiles={(files) => void onDropFiles(files)}
        disabled={disabled || busy}
        maxSizeBytes={10 * 1024 * 1024}
        label={busy ? 'Загрузка…' : 'Добавить изображения'}
        hint={`До ${maxImages} изображений. JPEG, PNG, WebP, AVIF, GIF.`}
        error={dropError}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableRow
                key={item.id ?? item.url}
                item={item}
                disabled={disabled || busy}
                allowPrimary={allowPrimary}
                isPrimary={primaryIndex === index}
                onRemove={() => void removeAt(index)}
                onPrimary={() => setPrimaryAt(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {items.length === 0 && <p className="text-xs text-slate-500">Пока нет изображений в галерее.</p>}
    </div>
  );
}
