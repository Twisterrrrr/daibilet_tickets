import { Send } from 'lucide-react';

import type { EventQuality } from '@/api/adminEventsQuality';
import { InCatalogBadge } from '@/components/InCatalogBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const EDITOR_STATUS_LABELS: Record<string, string> = {
  NEEDS_REVIEW: 'На проверке',
  IN_PROGRESS: 'В работе',
  PUBLISHED: 'Опубликовано',
  REJECTED: 'Отклонено',
};

type Props = {
  isActive: boolean;
  isHidden: boolean;
  issuesCount: number;
  quality: EventQuality | null;
  supplierIsActive?: boolean;
  /** Статус редактора (для override). Если override есть и не PUBLISHED — событие не показывается на сайте. */
  editorStatus?: string | null;
  hasOverride?: boolean;
  onPublish?: () => void;
  publishing?: boolean;
};

export function EventStatusLine({
  isActive,
  isHidden,
  issuesCount,
  quality,
  supplierIsActive,
  editorStatus,
  hasOverride,
  onPublish,
  publishing,
}: Props) {
  const supplierActive = supplierIsActive ?? true;
  const published = hasOverride ? editorStatus === 'PUBLISHED' : true;
  const inCatalog = isActive && !isHidden && supplierActive && published;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-background p-2 text-xs">
      {hasOverride && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Статус редактора:</span>
          <Badge variant={editorStatus === 'PUBLISHED' ? 'default' : 'secondary'}>
            {EDITOR_STATUS_LABELS[editorStatus ?? ''] ?? editorStatus ?? '—'}
          </Badge>
          {editorStatus !== 'PUBLISHED' && onPublish && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={onPublish}
              disabled={publishing || (quality != null && !quality.isSellable)}
              title={quality && !quality.isSellable ? 'Сначала исправьте проблемы качества' : 'Опубликовать — событие появится в каталоге на сайте'}
            >
              {publishing ? 'Публикуем…' : <><Send className="mr-1 h-3 w-3" /> Опубликовать</>}
            </Button>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">В каталоге:</span>
        <InCatalogBadge inCatalog={inCatalog} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Скрыто вручную:</span>
        <Badge variant={isHidden ? 'destructive' : 'outline'}>{isHidden ? 'Да' : 'Нет'}</Badge>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Причины:</span>
        <Badge variant={issuesCount > 0 ? 'destructive' : 'outline'}>{issuesCount}</Badge>
      </div>

      {quality && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Готово к продаже:</span>
          <Badge variant={quality.isSellable ? 'outline' : 'destructive'}>
            {quality.isSellable ? 'Да' : 'Нет'}
          </Badge>
        </div>
      )}

      {supplierActive === false && (
        <div className="text-[11px] text-amber-700">
          Поставщик заморожен — продажи отключены на уровне поставщика.
        </div>
      )}
    </div>
  );
}

