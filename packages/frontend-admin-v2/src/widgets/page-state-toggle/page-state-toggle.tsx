import { Button } from '@/shared/ui/button';
import type { PageDataState } from '@/shared/types/page-state';

const LABELS: Record<PageDataState, string> = {
  data: 'Данные',
  loading: 'Загрузка',
  empty: 'Пусто',
  error: 'Ошибка',
};

export function PageStateToggle({
  value,
  onChange,
}: {
  value: PageDataState;
  onChange: (v: PageDataState) => void;
}) {
  const states: PageDataState[] = ['data', 'loading', 'empty', 'error'];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-card border border-dashed border-border-soft bg-surface-alt/60 px-3 py-2">
      <span className="text-label text-text-muted">Состояние (демо):</span>
      <div className="flex flex-wrap gap-1">
        {states.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={value === s ? 'primary' : 'ghost'}
            className="rounded-full px-3"
            onClick={() => onChange(s)}
          >
            {LABELS[s]}
          </Button>
        ))}
      </div>
    </div>
  );
}
