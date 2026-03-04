import type { EventQuality } from '@/api/adminEventsQuality';
import { Badge } from '@/components/ui/badge';

type Props = {
  isActive: boolean;
  isHidden: boolean;
  issuesCount: number;
  quality: EventQuality | null;
};

export function EventStatusLine({ isActive, isHidden, issuesCount, quality }: Props) {
  const inCatalog = isActive && !isHidden;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-background p-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">В каталоге:</span>
        <Badge variant={inCatalog ? 'outline' : 'destructive'}>{inCatalog ? 'Да' : 'Нет'}</Badge>
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
    </div>
  );
}
*** End Patch ***!
