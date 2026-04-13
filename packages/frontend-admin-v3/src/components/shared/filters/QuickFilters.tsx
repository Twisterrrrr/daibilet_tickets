import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/cn';

export type QuickFilterItem = {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
};

export function QuickFilters({
  items,
  activeId,
  onChange,
  className,
}: {
  items: QuickFilterItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((i) => {
        const active = i.id === activeId;
        return (
          <Button
            key={i.id}
            type="button"
            variant={active ? 'secondary' : 'outline'}
            size="sm"
            disabled={Boolean(i.disabled)}
            onClick={() => onChange(i.id)}
            className="gap-2"
          >
            <span>{i.label}</span>
            {typeof i.count === 'number' ? <span className="tabular-nums text-muted-foreground">{i.count}</span> : null}
          </Button>
        );
      })}
    </div>
  );
}

