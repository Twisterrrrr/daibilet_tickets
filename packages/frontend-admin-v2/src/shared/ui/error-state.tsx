import { AlertTriangle } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

import { Button } from './button';

export function ErrorState({
  title = 'Не удалось загрузить данные',
  description = 'Проверьте подключение и попробуйте снова. Это демонстрация состояния ошибки.',
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-card border border-danger/15 bg-danger-soft/40 px-8 py-14 text-center',
        className,
      )}
      role="alert"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-section text-text-primary">{title}</p>
      <p className="max-w-md text-small text-text-secondary">{description}</p>
      {onRetry ? (
        <Button type="button" variant="secondary" className="mt-2" onClick={onRetry}>
          Повторить
        </Button>
      ) : null}
    </div>
  );
}
