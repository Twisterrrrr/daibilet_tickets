import { ImageIcon } from 'lucide-react';

import { FieldSketch } from '@/features/event-master-sketch/event-master-sketch-fields';
import { cn } from '@/shared/lib/cn';

export function EventMasterMediaTabSketch() {
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-small text-text-secondary">
        Обложка и галерея. Мок; волна R — загрузка и порядок в Cloudinary.
      </p>
      <div
        className={cn(
          'flex aspect-[3/2] max-w-md flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border-soft bg-surface-alt/80 text-center',
        )}
      >
        <ImageIcon className="h-7 w-7 text-text-muted" strokeWidth={1.25} aria-hidden />
        <span className="px-2 text-[11px] text-text-muted">Обложка 3:2 · перетащите или выберите файл</span>
      </div>
      <div className="space-y-2">
        <p className="text-label text-text-muted">Галерея (до 6)</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex h-14 w-14 items-center justify-center rounded-control border border-dashed border-border-soft bg-surface-alt text-[10px] text-text-muted"
            >
              +{i}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EventMasterSeoTabSketch() {
  return (
    <div className="max-w-3xl space-y-3">
      <p className="text-small text-text-secondary">Поиск и соцсети. Мок; волна R — сохранение в карточке.</p>
      <FieldSketch
        label="Title (страница)"
        placeholder="Прогулка на катере — билеты онлайн | Дайбилет"
        hint="Если пусто — из названия."
      />
      <FieldSketch
        label="Meta description"
        placeholder="Короткое описание для сниппета, до ~160 символов…"
        multiline
        rows={3}
      />
    </div>
  );
}
