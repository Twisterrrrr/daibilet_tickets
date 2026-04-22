import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/cn';

export function StickySaveBar({
  visible,
  onSave,
  onReset,
  className,
}: {
  visible: boolean;
  onSave: () => void;
  onReset?: () => void;
  className?: string;
}) {
  if (!visible) return null;

  return (
    <div className={cn('sticky bottom-4 z-10', className)}>
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
        <div className="text-sm text-muted-foreground">Есть несохранённые изменения</div>
        <div className="flex items-center gap-2">
          {onReset ? (
            <Button type="button" variant="outline" onClick={onReset}>
              Сбросить
            </Button>
          ) : null}
          <Button type="button" onClick={onSave}>
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}

