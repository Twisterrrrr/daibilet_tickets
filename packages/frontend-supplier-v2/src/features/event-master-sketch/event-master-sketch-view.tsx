import { ExternalLink, LayoutGrid, List } from 'lucide-react';
import { useEffect, useState } from 'react';

import { EventMasterMainTabSketch } from '@/features/event-master-sketch/event-master-main-tab-sketch';
import { EventMasterMediaTabSketch, EventMasterSeoTabSketch } from '@/features/event-master-sketch/event-master-media-seo-sketch';
import { EventMasterTicketsTabSketch } from '@/features/event-master-sketch/event-master-tickets-tab-sketch';
import { FieldSketch } from '@/features/event-master-sketch/event-master-sketch-fields';
import { cn } from '@/shared/lib/cn';
import { InlineTabs } from '@/shared/ui/inline-tabs';

import { Badge, Button, SectionTitle, Surface } from './sketch-primitives';

export type EventMasterSketchVariant = 'admin' | 'supplier';

export type EventMasterSketchMode = 'create' | 'edit';

const dtfShortRu = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatScheduleGridDayLabel(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  }).format(date);
}

function formatDatePlaceholderLocal(y: number, monthIndex: number, day: number): string {
  try {
    return dtfShortRu.format(new Date(y, monthIndex, day));
  } catch {
    return '';
  }
}

/** Пн 6 апр. 2026 — фиксированное окно мок-сетки (стабильные ключи ячеек). */
const MOCK_SCHEDULE_GRID_START = new Date(2026, 3, 6);

const HOURS_24 = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));

const PLACEHOLDER_DATE_SINGLE = formatDatePlaceholderLocal(2026, 3, 15);
const PLACEHOLDER_DATE_OPEN = formatDatePlaceholderLocal(2026, 5, 30);

function buildScheduleGridRows(dayCount: number): { key: string; label: string; isWeekend: boolean }[] {
  return Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(MOCK_SCHEDULE_GRID_START);
    d.setDate(MOCK_SCHEDULE_GRID_START.getDate() + i);
    const wd = d.getDay();
    const isWeekend = wd === 0 || wd === 6;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    return { key, label: formatScheduleGridDayLabel(d), isWeekend };
  });
}

type DateModeSketch = 'single' | 'recurrence' | 'open';

export function EventMasterSketchView({
  variant = 'supplier',
  mode = 'create',
}: {
  variant?: EventMasterSketchVariant;
  mode?: EventMasterSketchMode;
}) {
  const [mockEventId, setMockEventId] = useState<string | null>(null);
  const [dateMode, setDateMode] = useState<DateModeSketch>('single');
  const [rangePreset, setRangePreset] = useState<'1' | '7' | '14' | '30'>('7');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(['2026-04-08_10', '2026-04-08_12']),
  );

  const slotCount = selected.size;

  useEffect(() => {
    const rows = buildScheduleGridRows(Number(rangePreset));
    const validDays = new Set(rows.map((r) => r.key));
    setSelected((prev) => {
      const next = new Set<string>();
      for (const cell of prev) {
        const dayKey = cell.slice(0, 10);
        if (validDays.has(dayKey)) next.add(cell);
      }
      return next;
    });
  }, [rangePreset]);

  const toggleCell = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const scheduleCtx = {
    dateMode,
    setDateMode,
    rangePreset,
    setRangePreset,
    viewMode,
    setViewMode,
    selected,
    toggleCell,
    slotCount,
  };

  const banner =
    variant === 'admin' ? (
      <Badge variant="default">Мок · без API</Badge>
    ) : (
      <Badge variant="accent">Мок · поставщик · RBAC позже</Badge>
    );

  const title = mode === 'create' ? 'Новое событие' : 'Событие';

  const createMockDraft = () => {
    setMockEventId(`mock-${Math.random().toString(36).slice(2, 10)}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {banner}
        {mockEventId ? (
          <span className="font-mono text-small text-text-muted">
            eventId: <span className="text-text-primary">{mockEventId}</span>
          </span>
        ) : (
          <span className="text-small text-text-muted">
            До черновика — без «Продажи» и «Качество»; превью — кнопка снизу.
          </span>
        )}
      </div>

      <div>
        <h1 className="text-h1 text-text-primary">{title}</h1>
        <p className="mt-2 max-w-3xl text-body text-text-secondary">
          Тот же паттерн, что в админке V2. Волна M — визуал без сохранения.
        </p>
      </div>

      <Surface padding="md" tone="muted">
        <SectionTitle
          title="Разделы"
          description="Информация · Билеты · Расписание · Медиа · SEO; после черновика — Продажи и Качество."
        />
        <div className="mt-6">
          <InlineTabs
            key={mockEventId ? 'with-event' : 'draft'}
            defaultId="info"
            items={[
              {
                id: 'info',
                label: 'Информация',
                content: (
                  <EventMasterMainTabSketch
                    variant={variant}
                    mockEventId={mockEventId}
                    onCreateDraft={createMockDraft}
                  />
                ),
              },
              {
                id: 'tickets',
                label: 'Билеты и квоты',
                content: <EventMasterTicketsTabSketch />,
              },
              { id: 'schedule', label: 'Расписание', content: <ScheduleSketch {...scheduleCtx} /> },
              { id: 'media', label: 'Медиа', content: <EventMasterMediaTabSketch /> },
              { id: 'seo', label: 'SEO', content: <EventMasterSeoTabSketch /> },
              ...(mockEventId
                ? [
                    { id: 'sales', label: 'Продажи', content: <SalesTabSketch /> },
                    {
                      id: 'quality',
                      label: 'Качество',
                      content: <QualityTabSketch dateMode={dateMode} slotCount={slotCount} />,
                    },
                  ]
                : []),
            ]}
          />
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-6">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="gap-2"
            onClick={() => {
              window.open('https://daibilet.ru/events/progulka-na-katere', '_blank', 'noopener,noreferrer');
            }}
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Посмотреть
          </Button>
          <Button type="button" variant="secondary" size="md">
            Сохранить черновик (мок)
          </Button>
        </div>
      </Surface>
    </div>
  );
}

function SalesTabSketch() {
  return (
    <div className="space-y-4">
      <Surface padding="md">
        <SectionTitle title="Продажи" description="Вкладка после создания черновика (есть eventId)." />
        <ul className="mt-6 space-y-3 text-small text-text-secondary">
          <li>— Статус на витрине, период продаж, предпросмотр карточки.</li>
          <li>— Связь с расписанием и тарифами; остановка продаж по слотам.</li>
          <li>— Волна R: реальные переключатели и API.</li>
        </ul>
      </Surface>
    </div>
  );
}

function QualityTabSketch({ dateMode, slotCount }: { dateMode: DateModeSketch; slotCount: number }) {
  return (
    <div className="space-y-4 text-small text-text-secondary">
      <Surface padding="md">
        <SectionTitle title="Качество" description="После создания события — чек-лист и score." />
        <p className="mt-6">Агрегированная оценка карточки и замечания — как в карточке события V2.</p>
        <ul className="mt-4 space-y-2 border-t border-border-soft pt-4">
          <li>— Публикация: событие неактивно до явного действия (волна R).</li>
          <li>
            — Расписание:{' '}
            {dateMode === 'single'
              ? 'разовое'
              : dateMode === 'recurrence'
                ? `повтор (${slotCount} слотов, мок)`
                : 'открытая дата'}
            .
          </li>
        </ul>
      </Surface>
    </div>
  );
}

function ScheduleSketch({
  dateMode,
  setDateMode,
  rangePreset,
  setRangePreset,
  viewMode,
  setViewMode,
  selected,
  toggleCell,
  slotCount,
}: {
  dateMode: DateModeSketch;
  setDateMode: (m: DateModeSketch) => void;
  rangePreset: '1' | '7' | '14' | '30';
  setRangePreset: (p: '1' | '7' | '14' | '30') => void;
  viewMode: 'grid' | 'table';
  setViewMode: (v: 'grid' | 'table') => void;
  selected: Set<string>;
  toggleCell: (key: string) => void;
  slotCount: number;
}) {
  const gridRows = buildScheduleGridRows(Number(rangePreset));
  const gridTemplate = `minmax(9.5rem,11rem) repeat(24, minmax(1.75rem,1fr))`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Тип расписания">
        {(
          [
            { id: 'single' as const, label: 'Разовое' },
            { id: 'recurrence' as const, label: 'Повторяющееся' },
            { id: 'open' as const, label: 'Открытая дата' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={dateMode === opt.id}
            onClick={() => setDateMode(opt.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-label',
              dateMode === opt.id ? 'border-accent bg-accent/10 text-text-primary' : 'border-border-soft text-text-muted',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {dateMode === 'single' ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <FieldSketch label="Дата" placeholder={PLACEHOLDER_DATE_SINGLE} />
          <FieldSketch label="Время начала" placeholder="10:30" />
          <FieldSketch label="Длительность (мин)" placeholder="120" />
        </div>
      ) : null}

      {dateMode === 'recurrence' ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-label text-text-muted">Окно</span>
            <div className="flex flex-wrap gap-1">
              {(['1', '7', '14', '30'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setRangePreset(d)}
                  className={cn(
                    'rounded-control border px-2.5 py-1 text-label',
                    rangePreset === d ? 'border-accent bg-accent/10' : 'border-border-soft',
                  )}
                >
                  {d === '1' ? 'День' : `${d} дн.`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={viewMode === 'grid' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="mr-1 h-4 w-4" aria-hidden />
              Сетка
            </Button>
            <Button
              type="button"
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <List className="mr-1 h-4 w-4" aria-hidden />
              Таблица
            </Button>
          </div>

          {viewMode === 'grid' ? (
            <div className="overflow-x-auto rounded-card border border-border-soft bg-surface p-3">
              <div className="inline-block min-w-max">
                <div className="grid gap-y-1 gap-x-0.5" style={{ gridTemplateColumns: gridTemplate }}>
                  <div className="sticky left-0 z-[1] bg-surface py-1" />
                  {HOURS_24.map((h) => (
                    <div
                      key={h}
                      className="py-1 text-center text-[11px] font-medium tabular-nums text-text-muted"
                      title={`${h}:00`}
                    >
                      {h}
                    </div>
                  ))}
                  {gridRows.map((row) => (
                    <div key={row.key} className="contents">
                      <div
                        className={cn(
                          'sticky left-0 z-[1] flex min-h-9 items-center border-r border-border-soft/80 py-1 pl-1 pr-2 text-small leading-tight text-text-primary',
                          row.isWeekend ? 'bg-success-soft/80' : 'bg-surface',
                        )}
                      >
                        {row.label}
                      </div>
                      {HOURS_24.map((h) => {
                        const cellKey = `${row.key}_${h}`;
                        const on = selected.has(cellKey);
                        return (
                          <button
                            key={cellKey}
                            type="button"
                            aria-pressed={on}
                            aria-label={`${row.label}, ${h}:00`}
                            onClick={() => toggleCell(cellKey)}
                            className={cn(
                              'h-9 min-w-[1.75rem] rounded-sm border text-label transition-colors',
                              on
                                ? 'border-accent bg-accent/25 text-text-primary'
                                : cn(
                                    'border-border-soft/60 hover:border-border',
                                    row.isWeekend ? 'bg-success-soft/55' : 'bg-surface',
                                  ),
                            )}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Surface padding="md" tone="muted">
              <p className="text-small text-text-secondary">Табличный вид слотов — тот же набор, другая подача.</p>
            </Surface>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="accent" className="tabular-nums">
              Слотов: {slotCount}
            </Badge>
            <span className="text-small text-text-muted">Лимит batch (мок): 200</span>
          </div>
        </>
      ) : null}

      {dateMode === 'open' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <FieldSketch label="Окончание периода" placeholder={PLACEHOLDER_DATE_OPEN} />
          <label className="flex items-center gap-2 pt-6 text-body text-text-primary">
            <input type="checkbox" className="rounded border-border-soft" disabled readOnly checked />
            Бессрочно
          </label>
        </div>
      ) : null}
    </div>
  );
}
