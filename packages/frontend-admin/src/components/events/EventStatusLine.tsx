import type { EventQuality } from '@/api/adminEventsQuality';
import { InCatalogBadge } from '@/components/InCatalogBadge';

type Props = {
  isActive: boolean;
  isHidden: boolean;
  issuesCount: number;
  quality: EventQuality | null;
  supplierIsActive?: boolean;
};

export function EventStatusLine({ isActive, isHidden, issuesCount, quality, supplierIsActive }: Props) {
  const supplierActive = supplierIsActive ?? true;
  const inCatalog = isActive && !isHidden && supplierActive;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-background p-2 text-xs">
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
          <span className="text-muted-foreground">Sellable:</span>
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

