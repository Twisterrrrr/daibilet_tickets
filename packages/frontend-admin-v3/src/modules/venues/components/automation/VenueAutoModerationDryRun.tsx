import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  postAutoModerationDryRun,
  type AutoModerationDryRunResponse,
} from '@/modules/venues/api/venue-automation';
import { useMutation } from '@tanstack/react-query';
import * as React from 'react';

export function VenueAutoModerationDryRun() {
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [limit, setLimit] = React.useState(100);
  const [result, setResult] = React.useState<AutoModerationDryRunResponse | null>(null);

  const m = useMutation({
    mutationFn: () =>
      postAutoModerationDryRun({
        from: from.trim() || undefined,
        to: to.trim() || undefined,
        limit,
      }),
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-medium">Dry-run</h3>
        <p className="text-sm text-muted-foreground">
          Оценка правил без изменений в базе. Используйте перед включением авто-модерации.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">from (ISO date)</span>
          <Input id="dry-from" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="необязательно" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">to (ISO date)</span>
          <Input id="dry-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="необязательно" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">limit</span>
          <Input
            id="dry-limit"
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) || 100)}
          />
        </label>
      </div>
      <Button type="button" onClick={() => m.mutate()} disabled={m.isPending}>
        {m.isPending ? 'Считаем…' : 'Запустить dry run'}
      </Button>
      {m.isError ? (
        <p className="text-sm text-destructive">
          {m.error instanceof Error ? m.error.message : 'Ошибка запроса'}
        </p>
      ) : null}
      {result ? (
        <div className="space-y-2 text-sm">
          <p>
            Оценено: <strong>{result.totalEvaluated}</strong> · Авто-approve:{' '}
            <strong>{result.autoApproveCandidates}</strong> · Авто-merge:{' '}
            <strong>{result.autoMergeCandidates}</strong>
          </p>
          {result.samples.length > 0 ? (
            <ul className="max-h-48 list-inside list-disc overflow-y-auto rounded border border-border p-2 text-muted-foreground">
              {result.samples.map((s) => (
                <li key={s.venueId}>
                  {s.venueId.slice(0, 8)}… — {s.decision.action}
                  {s.confidenceScore !== null ? ` · conf ${s.confidenceScore.toFixed(2)}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Нет примеров с авто-действием в выборке.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
