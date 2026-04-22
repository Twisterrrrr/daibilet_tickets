import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  postAutoModerationRun,
  type AutoModerationRunResponse,
} from '@/modules/venues/api/venue-automation';
import { useMutation } from '@tanstack/react-query';
import * as React from 'react';

export function VenueAutoModerationRunPanel() {
  const [limit, setLimit] = React.useState(10);
  const [onlyHigh, setOnlyHigh] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [result, setResult] = React.useState<AutoModerationRunResponse | null>(null);

  const m = useMutation({
    mutationFn: () => postAutoModerationRun({ limit, onlyHighConfidence: onlyHigh }),
    onSuccess: (data) => {
      setResult(data);
      setConfirmOpen(false);
    },
  });

  return (
    <div className="space-y-4 rounded-lg border border-destructive/30 bg-card p-4">
      <div>
        <h3 className="text-sm font-medium text-destructive">Реальный запуск</h3>
        <p className="text-sm text-muted-foreground">
          Будут вызваны approve / merge для подходящих DRAFT. Требуется{' '}
          <code className="rounded bg-muted px-1">AUTO_MODERATION_ENABLED=true</code> на сервере.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Лимит</span>
          <Input
            id="run-limit"
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) || 10)}
          />
        </label>
        <div className="flex items-end gap-2 pb-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyHigh}
              onChange={(e) => setOnlyHigh(e.target.checked)}
            />
            только высокая уверенность
          </label>
        </div>
      </div>
      {!confirmOpen ? (
        <Button type="button" variant="destructive" onClick={() => setConfirmOpen(true)}>
          Подготовить запуск…
        </Button>
      ) : (
        <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
          <p className="text-sm font-medium">Подтвердите автоматическое применение действий</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="destructive" onClick={() => m.mutate()} disabled={m.isPending}>
              {m.isPending ? 'Выполняется…' : 'Подтвердить и запустить'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={m.isPending}>
              Отмена
            </Button>
          </div>
        </div>
      )}
      {m.isError ? (
        <p className="text-sm text-destructive">
          {m.error instanceof Error ? m.error.message : 'Ошибка (возможно, авто-модерация отключена)'}
        </p>
      ) : null}
      {result ? (
        <div className="text-sm text-muted-foreground">
          <p>
            processed {result.processed} · approved {result.autoApproved} · merged {result.autoMerged} · skipped{' '}
            {result.skipped}
            {result.shadow ? ' · shadow mode' : ''}
          </p>
          {result.errors.length > 0 ? (
            <ul className="mt-2 max-h-32 list-inside list-disc overflow-y-auto text-destructive">
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
