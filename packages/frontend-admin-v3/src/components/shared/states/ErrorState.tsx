import { Button } from '@/components/ui/button';

export function ErrorState({
  title = 'Ошибка',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="text-sm font-medium">{title}</div>
      {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
      {onRetry ? (
        <div className="mt-4">
          <Button type="button" variant="outline" onClick={onRetry}>
            Повторить
          </Button>
        </div>
      ) : null}
    </div>
  );
}

