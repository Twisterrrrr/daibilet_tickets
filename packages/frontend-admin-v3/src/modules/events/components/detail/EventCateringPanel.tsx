import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import type { AdminEventDetail } from '@/modules/events/api/detail';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

type CateringState = {
  enabled: boolean;
  type: string;
  includedInPrice: boolean | null;
  menuMarkdown: string;
};

function parseCatering(detail: AdminEventDetail): CateringState {
  const ctd = detail.override?.contentTemplateData;
  const root = ctd && typeof ctd === 'object' ? (ctd as Record<string, unknown>) : null;
  const cat = root?.catering && typeof root.catering === 'object' ? (root.catering as Record<string, unknown>) : null;
  return {
    enabled: Boolean(cat?.enabled),
    type: typeof cat?.type === 'string' ? cat!.type : '',
    includedInPrice: typeof cat?.includedInPrice === 'boolean' ? (cat!.includedInPrice as boolean) : null,
    menuMarkdown: typeof cat?.menuMarkdown === 'string' ? cat!.menuMarkdown : '',
  };
}

function applyWrap(
  ta: HTMLTextAreaElement,
  before: string,
  after: string = before,
) {
  const start = ta.selectionStart ?? 0;
  const end = ta.selectionEnd ?? 0;
  const value = ta.value ?? '';
  const selected = value.slice(start, end);
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  ta.value = next;
  const cursor = start + before.length + selected.length + after.length;
  ta.setSelectionRange(cursor, cursor);
}

function applyLinePrefix(ta: HTMLTextAreaElement, prefix: string) {
  const start = ta.selectionStart ?? 0;
  const end = ta.selectionEnd ?? 0;
  const value = ta.value ?? '';
  const sel = value.slice(start, end);
  const lines = (sel || '').split('\n');
  const nextSel = lines.map((l) => (l.trim() ? `${prefix}${l}` : l)).join('\n');
  const next = value.slice(0, start) + nextSel + value.slice(end);
  ta.value = next;
  ta.setSelectionRange(start, start + nextSel.length);
}

export function EventCateringPanel({ eventId, detail }: { eventId: string; detail: AdminEventDetail }) {
  const qc = useQueryClient();
  const [state, setState] = React.useState<CateringState>(() => parseCatering(detail));
  const taRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => setState(parseCatering(detail)), [detail.override?.contentTemplateData, eventId]);

  const saveM = useMutation({
    mutationFn: async () => {
      return adminApi.patch(`/admin/events/${eventId}/catering`, {
        enabled: state.enabled,
        type: state.type || null,
        includedInPrice: state.includedInPrice,
        menuMarkdown: state.menuMarkdown.trim() === '' ? null : state.menuMarkdown,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-event', eventId] });
    },
  });

  const initial = React.useMemo(() => parseCatering(detail), [detail]);
  const dirty =
    initial.enabled !== state.enabled ||
    initial.type !== state.type ||
    initial.includedInPrice !== state.includedInPrice ||
    initial.menuMarkdown.trim() !== state.menuMarkdown.trim();

  return (
    <details className="group rounded-lg border border-border/80 bg-card open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
        <span>
          Питание <span className="font-normal text-muted-foreground">(для речных / теплоходов)</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-4 border-t px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.enabled}
              onChange={(e) => setState((s) => ({ ...s, enabled: e.target.checked }))}
            />
            Есть питание
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              disabled={!state.enabled}
              checked={Boolean(state.includedInPrice)}
              onChange={(e) => setState((s) => ({ ...s, includedInPrice: e.target.checked }))}
            />
            Включено в стоимость
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`cateringType-${eventId}`}>
              Тип питания
            </label>
            <select
              id={`cateringType-${eventId}`}
              disabled={!state.enabled}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
              value={state.type}
              onChange={(e) => setState((s) => ({ ...s, type: e.target.value }))}
            >
              <option value="">— не задано —</option>
              <option value="BREAKFAST">Завтрак</option>
              <option value="LUNCH">Ланч</option>
              <option value="DINNER">Обед</option>
              <option value="BRUNCH">Бранч</option>
              <option value="SUPPER">Ужин</option>
              <option value="BUFFET">Шведский стол</option>
              <option value="SNACKS">Закуски</option>
              <option value="TASTING">Дегустация</option>
              <option value="BAR">Бар / напитки</option>
              <option value="OTHER">Другое</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`menuMd-${eventId}`}>
              Меню (Markdown)
            </label>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!state.enabled}
                onClick={() => {
                  const ta = taRef.current;
                  if (!ta) return;
                  ta.focus();
                  applyWrap(ta, '**');
                  setState((s) => ({ ...s, menuMarkdown: ta.value }));
                }}
              >
                Жирный
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!state.enabled}
                onClick={() => {
                  const ta = taRef.current;
                  if (!ta) return;
                  ta.focus();
                  applyWrap(ta, '*');
                  setState((s) => ({ ...s, menuMarkdown: ta.value }));
                }}
              >
                Курсив
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!state.enabled}
                onClick={() => {
                  const ta = taRef.current;
                  if (!ta) return;
                  ta.focus();
                  applyLinePrefix(ta, '- ');
                  setState((s) => ({ ...s, menuMarkdown: ta.value }));
                }}
              >
                Список
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!state.enabled}
                onClick={() => {
                  const ta = taRef.current;
                  if (!ta) return;
                  ta.focus();
                  applyWrap(ta, '[текст](', ')');
                  setState((s) => ({ ...s, menuMarkdown: ta.value }));
                }}
              >
                Ссылка
              </Button>
            </div>
          </div>
          <textarea
            id={`menuMd-${eventId}`}
            ref={taRef}
            disabled={!state.enabled}
            className="min-h-[120px] w-full rounded-md border bg-background p-2 text-sm disabled:opacity-50"
            value={state.menuMarkdown}
            onChange={(e) => setState((s) => ({ ...s, menuMarkdown: e.target.value }))}
            placeholder="Например:\n- Салат «Цезарь»\n- Горячее: стейк из лосося\n- Десерт\n\n**Напитки** включены/не включены…"
            maxLength={5000}
          />
          <div className="text-[11px] text-muted-foreground">{state.menuMarkdown.length} / 5000</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={!dirty || saveM.isPending} onClick={() => saveM.mutate()}>
            {saveM.isPending ? 'Сохранение…' : 'Сохранить питание'}
          </Button>
          {saveM.isSuccess && !dirty && !saveM.isPending ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Сохранено</span>
          ) : null}
          {saveM.isError ? <span className="text-xs text-destructive">Не удалось сохранить</span> : null}
        </div>
      </div>
    </details>
  );
}

