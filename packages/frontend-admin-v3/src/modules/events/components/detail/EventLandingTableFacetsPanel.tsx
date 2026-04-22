import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import type { AdminEventDetail } from '@/modules/events/api/detail';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

/**
 * Речные: поля таблицы сравнения, которые являются свойствами события (Event).
 * Свёрнуто по умолчанию — чтобы не шуметь в карточках музеев и прочих форматов.
 */
export function EventLandingTableFacetsPanel({
  eventId,
  detail,
}: {
  eventId: string;
  detail: AdminEventDetail;
}) {
  const qc = useQueryClient();
  const [vesselName, setVesselName] = React.useState(detail.vesselName ?? '');
  const [experienceFormat, setExperienceFormat] = React.useState(detail.experienceFormat ?? '');

  React.useEffect(() => {
    setVesselName(detail.vesselName ?? '');
    setExperienceFormat(detail.experienceFormat ?? '');
  }, [
    detail.vesselName,
    detail.experienceFormat,
    eventId,
  ]);

  const saveM = useMutation({
    mutationFn: async () => {
      return adminApi.patch<{
        id: string;
        vesselName: string | null;
        experienceFormat: string | null;
      }>(`/admin/events/${eventId}/landing-table-facets`, {
        vesselName: vesselName.trim() === '' ? null : vesselName.trim(),
        experienceFormat: experienceFormat === '' ? null : experienceFormat,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-event', eventId] });
    },
  });

  const dirty =
    (detail.vesselName ?? '') !== vesselName.trim() ||
    (detail.experienceFormat ?? '') !== experienceFormat;

  return (
    <details className="group rounded-lg border border-border/80 bg-card open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
        <span>
          Речные прогулки{' '}
          <span className="font-normal text-muted-foreground">(таблица сравнения)</span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-4 border-t px-4 py-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Только для речных прогулок (подкатегория «Речные прогулки»). Это свойства события для таблицы сравнения на
          лендингах; блок скрыт для остальных категорий.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`vessel-${eventId}`}>
              Теплоход / судно
            </label>
            <input
              id={`vessel-${eventId}`}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={vesselName}
              onChange={(ev) => setVesselName(ev.target.value)}
              placeholder="Например: «Москва-87»"
              maxLength={160}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`exp-${eventId}`}>
              Формат круиза
            </label>
            <select
              id={`exp-${eventId}`}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={experienceFormat}
              onChange={(ev) => setExperienceFormat(ev.target.value)}
            >
              <option value="">— не задано —</option>
              <option value="CLASSIC">Классический</option>
              <option value="ROMANTIC">Романтический</option>
              <option value="VIP">VIP</option>
              <option value="PANORAMIC">Панорамный</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={!dirty || saveM.isPending} onClick={() => saveM.mutate()}>
            {saveM.isPending ? 'Сохранение…' : 'Сохранить блок'}
          </Button>
          {saveM.isSuccess && !dirty && !saveM.isPending ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Сохранено</span>
          ) : null}
          {saveM.isError ? (
            <span className="text-xs text-destructive">Не удалось сохранить. Проверьте права и формат полей.</span>
          ) : null}
        </div>
      </div>
    </details>
  );
}
