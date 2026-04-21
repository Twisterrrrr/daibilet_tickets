import { Button } from '@/components/ui/button';
import type { VenueImportSourceFilter } from '@/modules/venues/api/moderation-analytics';
import * as React from 'react';

type Props = {
  from: string;
  to: string;
  importSource: VenueImportSourceFilter;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onImportSourceChange: (v: VenueImportSourceFilter) => void;
  onApply: () => void;
};

export function VenueAnalyticsFilterBar({
  from,
  to,
  importSource,
  onFromChange,
  onToChange,
  onImportSourceChange,
  onApply,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">С даты</span>
        <input
          type="date"
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">По дату</span>
        <input
          type="date"
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Источник</span>
        <select
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
          value={importSource}
          onChange={(e) => onImportSourceChange((e.target.value || '') as VenueImportSourceFilter)}
        >
          <option value="">Все</option>
          <option value="TICKETSCLOUD">TicketsCloud</option>
          <option value="TEPLOHOD">Теплоход</option>
        </select>
      </label>
      <Button type="button" size="sm" onClick={() => onApply()}>
        Применить
      </Button>
    </div>
  );
}
