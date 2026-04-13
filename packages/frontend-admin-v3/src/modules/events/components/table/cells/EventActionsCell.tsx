import { Button } from '@/components/ui/button';
import type { EventRowItem } from '../types';

export function EventActionsCell({
  item,
  onToggleArchive,
}: {
  item: EventRowItem;
  onToggleArchive: (id: string, nextArchived: boolean) => Promise<void>;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onToggleArchive(item.id, !Boolean(item.isArchived))}
      >
        {item.isArchived ? 'Вернуть' : 'В архив'}
      </Button>
    </div>
  );
}

