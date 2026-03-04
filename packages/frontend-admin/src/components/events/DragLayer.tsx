import type { DragState } from '@/components/events/useSessionDrag';
import { formatDateRu, formatTimeRu } from '@/lib/sessions';
import { Badge } from '@/components/ui/badge';

type Props = {
  drag: DragState;
};

export function DragLayer({ drag }: Props) {
  if (drag.phase !== 'dragging') return null;

  const { proposed, isValid, invalidReason } = drag;

  const labelDate = formatDateRu(proposed.startIso);
  const labelTime = formatTimeRu(proposed.startIso);

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <div
        className={`absolute rounded border text-xs shadow-sm ${
          isValid ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10'
        }`}
        style={{
          top: proposed.topPx,
          left: proposed.leftPx,
          width: proposed.widthPx,
          height: proposed.heightPx,
        }}
      >
        <div className="flex h-full flex-col justify-between p-1">
          <div className="font-medium">
            {labelDate} {labelTime}
          </div>
          {!isValid && invalidReason && (
            <div className="flex justify-end">
              <Badge variant="destructive">
                {invalidReason === 'OUT_OF_RANGE' && 'Вне диапазона'}
                {invalidReason === 'CONFLICT' && 'Конфликт по времени'}
                {invalidReason === 'NOT_DRAGGABLE' && 'Перетаскивание недоступно'}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

