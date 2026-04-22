import { ChevronDown, ChevronRight, Minus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';

import { FieldSketch } from '@/features/event-master-sketch/event-master-sketch-fields';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { SectionTitle } from '@/shared/ui/section-title';
import { Surface } from '@/shared/ui/surface';

/** Мок общей квоты — для подсказок в UI варианта билета. */
const MOCK_EVENT_TOTAL_QUOTA = 500;

const money = (n: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const inputClass =
  'w-full rounded-control border border-border-soft bg-surface px-2.5 py-1.5 text-body text-text-primary placeholder:text-text-muted transition-colors hover:border-border focus-visible:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';

const WEEKDAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'] as const;

const TICKET_TYPES = [
  { id: 'general', label: 'Общий' },
  { id: 'adult', label: 'Взрослый' },
  { id: 'child', label: 'Детский' },
  { id: 'concession', label: 'Льготный' },
] as const;

type TicketTypeId = (typeof TICKET_TYPES)[number]['id'];

export function EventMasterTicketsTabSketch() {
  const [rowOpen, setRowOpen] = useState(true);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit' }>(null);

  return (
    <div className="space-y-6">
      <Surface padding="md">
        <SectionTitle title="Квота мест" description="Общее количество доступных мест на событие; лимиты категорий не могут её превысить." />
        <div className="mt-6 max-w-md">
          <FieldSketch
            label="Общая квота"
            placeholder={`Например: ${MOCK_EVENT_TOTAL_QUOTA}`}
            hint="Мок; на волне R — родительский лимит для всех категорий с «безлимитом»."
          />
        </div>
      </Surface>

      <Surface padding="md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            title="Категории билетов"
            description="Цена, тип, квота на категорию; по умолчанию безлимит в рамках общей квоты."
          />
          <Button type="button" variant="primary" size="md" onClick={() => setModal({ mode: 'create' })}>
            <Plus className="h-4 w-4" aria-hidden />
            Создать
          </Button>
        </div>

        <div className="mt-6 overflow-x-auto rounded-control border border-border-soft">
          <div className="min-w-[36rem]">
            <div className="grid grid-cols-[minmax(0,1fr)_7rem_8.5rem_5.5rem] gap-2 border-b border-border-soft bg-surface-alt/80 px-3 py-2 text-label text-text-muted sm:px-4">
              <span>Название</span>
              <span className="text-right">Квота</span>
              <span className="text-right">Цена</span>
              <span className="w-[4.5rem] shrink-0 justify-self-end" aria-hidden />
            </div>

            <div className="divide-y divide-border-soft">
              <div>
                <div className="grid grid-cols-[minmax(0,1fr)_7rem_8.5rem_5.5rem] items-center gap-2 px-2 py-2.5 sm:px-4">
                  <div className="flex min-w-0 items-start gap-1">
                    <button
                      type="button"
                      className="mt-0.5 shrink-0 rounded p-0.5 text-text-muted hover:bg-surface-alt hover:text-text-primary"
                      aria-expanded={rowOpen}
                      onClick={() => setRowOpen((v) => !v)}
                    >
                      {rowOpen ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
                    </button>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary">Взрослый</p>
                      <p className="text-small text-text-secondary">Взрослый · без льгот</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-medium tabular-nums text-text-primary" title="В рамках общей квоты">
                      ∞
                    </span>
                    <p className="text-[10px] leading-tight text-text-muted">общая</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <span className="text-small text-text-muted line-through">{money(1200)}</span>{' '}
                    <span className="font-semibold text-text-primary">{money(1000)}</span>
                  </div>
                  <div className="flex justify-end gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0 p-0 text-accent hover:text-accent"
                      aria-label="Редактировать вариант"
                      onClick={() => setModal({ mode: 'edit' })}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0 p-0 text-danger hover:text-danger"
                      aria-label="Удалить вариант"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
                {rowOpen ? (
                  <div className="border-t border-border-soft bg-surface-alt/50 px-4 py-2.5 pl-11 text-[12px] text-text-secondary">
                    Квота ∞ = не больше общей ({MOCK_EVENT_TOTAL_QUOTA}); свой лимит задаётся в модалке.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-label font-medium text-warning hover:underline"
            onClick={() => setDraftsOpen((v) => !v)}
          >
            Черновики удалённых билетов
            <Badge variant="default" className="tabular-nums">
              1
            </Badge>
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', draftsOpen && 'rotate-180')}
              aria-hidden
            />
          </button>
          {draftsOpen ? (
            <p className="mt-2 max-w-xl text-small text-text-secondary">
              Мок: список восстановления удалённых вариантов — как в legacy.
            </p>
          ) : null}
        </div>
      </Surface>

      {modal ? (
        <TicketVariantModalSketch mode={modal.mode} onClose={() => setModal(null)} />
      ) : null}
    </div>
  );
}

type QuotaMode = 'unlimited' | 'limited';

function TicketVariantModalSketch({ mode, onClose }: { mode: 'create' | 'edit'; onClose: () => void }) {
  const titleId = useId();
  const [ticketType, setTicketType] = useState<TicketTypeId>('general');
  const [quotaMode, setQuotaMode] = useState<QuotaMode>('unlimited');
  const [quotaLimit, setQuotaLimit] = useState(120);
  const [meal, setMeal] = useState(false);
  const [weekdayLimit, setWeekdayLimit] = useState(mode === 'edit');
  const [weekdays, setWeekdays] = useState<Set<number>>(() => new Set());
  const [group, setGroup] = useState(mode === 'edit');
  const [groupSize, setGroupSize] = useState(1);
  const [dependent, setDependent] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleDay = (i: number) => {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <button type="button" className="absolute inset-0 bg-text-primary/20 backdrop-blur-[1px]" aria-label="Закрыть" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-card border border-border-soft bg-surface shadow-soft sm:max-h-[min(calc(100vh-2rem),880px)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border-soft px-4 py-3 sm:px-5 sm:py-3.5">
          <h2 id={titleId} className="text-section text-text-primary">
            {mode === 'create' ? 'Создать вариант билета' : 'Редактировать вариант билета'}
          </h2>
          <button
            type="button"
            className="rounded-control p-1.5 text-text-muted hover:bg-surface-alt hover:text-text-primary"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Две колонки на md+; скролл только если не влезло по высоте окна */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-y-auto overscroll-contain md:grid-cols-2">
          <div className="space-y-4 border-border-soft p-4 sm:p-5 md:border-r md:pr-6">
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-label text-text-muted">Название</span>
                <input className={inputClass} placeholder="Укажите название" defaultValue={mode === 'edit' ? 'Взрослый' : ''} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-label text-text-muted">Цена</span>
                  <input className={cn(inputClass, 'tabular-nums')} type="number" defaultValue={1000} />
                </label>
                <label className="block space-y-1">
                  <span className="text-label text-text-muted">Старая цена</span>
                  <input className={cn(inputClass, 'tabular-nums')} type="number" defaultValue={1200} />
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-label text-text-muted">Тип билета</span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Тип билета">
                {TICKET_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTicketType(t.id)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
                      ticketType === t.id
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-accent/35 bg-surface text-accent hover:bg-accent/10',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-control border border-border-soft bg-surface-alt/50 p-3">
              <p className="text-label font-medium text-text-primary">Квота категории</p>
              <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                Родитель — общая квота события: <span className="tabular-nums font-medium text-text-secondary">{MOCK_EVENT_TOTAL_QUOTA}</span> мест.
              </p>
              <div className="mt-3 space-y-2">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="radio"
                    name="ticket-quota-sketch"
                    className="mt-0.5 h-3.5 w-3.5 border-border-soft text-accent"
                    checked={quotaMode === 'unlimited'}
                    onChange={() => setQuotaMode('unlimited')}
                  />
                  <span className="text-small text-text-primary">
                    Безлимит <span className="text-text-muted">(в рамках общей квоты)</span>
                  </span>
                </label>
                <label className="flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-2">
                  <input
                    type="radio"
                    name="ticket-quota-sketch"
                    className="h-3.5 w-3.5 shrink-0 border-border-soft text-accent"
                    checked={quotaMode === 'limited'}
                    onChange={() => setQuotaMode('limited')}
                  />
                  <span className="text-small text-text-primary">Свой лимит, шт.</span>
                  <input
                    type="number"
                    min={1}
                    max={MOCK_EVENT_TOTAL_QUOTA}
                    value={quotaLimit}
                    disabled={quotaMode !== 'limited'}
                    onChange={(e) => setQuotaLimit(Number(e.target.value) || 0)}
                    className={cn(
                      inputClass,
                      'w-[5.5rem] py-1 tabular-nums disabled:opacity-45',
                    )}
                  />
                  <span className="text-[11px] text-text-muted">не больше {MOCK_EVENT_TOTAL_QUOTA}</span>
                </label>
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-label text-text-muted">Примечание</span>
              <textarea
                className={cn(inputClass, 'min-h-[4.5rem] resize-y')}
                placeholder="Возраст, категории гостей…"
                rows={2}
              />
            </label>
          </div>

          <div className="space-y-2 border-t border-border-soft p-4 sm:p-5 md:border-t-0 md:pl-6">
            <p className="text-label text-text-muted">Дополнительно</p>
            <ToggleRowCompact checked={meal} onChange={setMeal} title="Питание включено" description={null} />
            <ToggleRowCompact
              checked={weekdayLimit}
              onChange={setWeekdayLimit}
              title="Только в выбранные дни"
              description="Дни недели"
            >
              {weekdayLimit ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {WEEKDAYS.map((label, i) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={cn(
                        'min-w-[2rem] rounded border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                        weekdays.has(i)
                          ? 'border-accent bg-accent/15 text-text-primary'
                          : 'border-border-soft bg-surface text-text-muted hover:border-border',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </ToggleRowCompact>
            <ToggleRowCompact checked={group} onChange={setGroup} title="Групповой билет" description="Гостей на один билет">
              {group ? (
                <div className="mt-2 inline-flex items-center gap-0.5 rounded border border-border-soft p-0.5">
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 text-text-muted hover:bg-surface-alt"
                    aria-label="Уменьшить"
                    onClick={() => setGroupSize((n) => Math.max(1, n - 1))}
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <span className="min-w-[1.75rem] text-center text-[13px] font-medium tabular-nums">{groupSize}</span>
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 text-text-muted hover:bg-surface-alt"
                    aria-label="Увеличить"
                    onClick={() => setGroupSize((n) => Math.min(99, n + 1))}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              ) : null}
            </ToggleRowCompact>
            <ToggleRowCompact
              checked={dependent}
              onChange={setDependent}
              title="Не самостоятельный"
              description="Только с другим вариантом в корзине"
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-border-soft px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" size="md" className="w-full sm:w-auto" onClick={onClose}>
              Отмена
            </Button>
            <Button type="button" variant="primary" size="md" className="w-full sm:w-auto sm:min-w-[10rem]" onClick={onClose}>
              Сохранить
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-text-muted sm:text-right">Мок: без API.</p>
        </div>
      </div>
    </div>
  );
}

function ToggleRowCompact({
  checked,
  onChange,
  title,
  description,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-control border border-border-soft bg-surface px-2.5 py-2">
      <label className="flex cursor-pointer gap-2">
        <input
          type="checkbox"
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-border-soft text-accent focus:ring-accent/30"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium leading-tight text-text-primary">{title}</span>
          {description ? <span className="mt-0.5 block text-[11px] leading-snug text-text-secondary">{description}</span> : null}
        </span>
      </label>
      {children}
    </div>
  );
}
