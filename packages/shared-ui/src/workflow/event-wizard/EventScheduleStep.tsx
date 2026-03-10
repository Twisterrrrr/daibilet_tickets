import { useMemo } from 'react';

import type { EventWizardScheduleDraft } from './EventWizard.types';

export interface ScheduleStepProps {
  value: EventWizardScheduleDraft;
  onChange: (next: EventWizardScheduleDraft) => void;
}

export function ScheduleStep({ value, onChange }: ScheduleStepProps) {
  const summary = useMemo(() => buildScheduleSummary(value), [value]);

  return (
    <div className="space-y-6">
      <ScheduleBuilder value={value} onChange={onChange} summary={summary} />
      <ScheduleExceptionsEditor value={value} onChange={onChange} />
    </div>
  );
}

export interface ScheduleBuilderProps {
  value: EventWizardScheduleDraft;
  onChange: (next: EventWizardScheduleDraft) => void;
  summary: string;
}

export function ScheduleBuilder({ value, onChange, summary }: ScheduleBuilderProps) {
  const handleModeChange = (mode: EventWizardScheduleDraft['mode']) => {
    onChange({ ...value, mode });
  };

  const handleTimezoneChange = (tz: string) => {
    onChange({ ...value, timezone: tz });
  };

  const handleStartsChange = (startsAtList: string[]) => {
    onChange({ ...value, startsAtList });
  };

  return (
    <div className="rounded-xl border bg-white px-4 py-4 sm:px-6 sm:py-5">
      <div className="mb-4 space-y-1">
        <h2 className="text-sm font-semibold text-slate-900">Расписание</h2>
        <p className="text-xs text-slate-500">
          Настройте правило проведения события и сгенерируйте слоты только по времени начала.
        </p>
        <p className="text-xs text-slate-600">{summary}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="mb-1 block text-sm font-medium text-slate-800">Часовой пояс</label>
          <select
            value={value.timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
          >
            <option value="">Выберите часовой пояс</option>
            <option value="Europe/Moscow">Europe/Moscow</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="mb-1 block text-sm font-medium text-slate-800">Режим</label>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleModeChange('single')}
              className={modeButtonClasses(value.mode === 'single')}
            >
              Одиночное
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('recurring')}
              className={modeButtonClasses(value.mode === 'recurring')}
            >
              Повторяющееся
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('manual-multiple')}
              className={modeButtonClasses(value.mode === 'manual-multiple')}
            >
              Несколько дат вручную
            </button>
          </div>
        </div>

        <RecurrenceEditor value={value} onChange={onChange} />

        <StartsAtList startsAtList={value.startsAtList} onChange={handleStartsChange} />
      </div>
    </div>
  );
}

function modeButtonClasses(active: boolean) {
  return [
    'rounded-full border px-3 py-1 font-medium transition-colors',
    active
      ? 'border-slate-900 bg-slate-900 text-white'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ].join(' ');
}

export interface RecurrenceEditorProps {
  value: EventWizardScheduleDraft;
  onChange: (next: EventWizardScheduleDraft) => void;
}

export function RecurrenceEditor({ value, onChange }: RecurrenceEditorProps) {
  const rule = value.recurrenceRule;

  if (value.mode !== 'recurring') {
    return null;
  }

  const handleIntervalChange = (n: number) => {
    onChange({
      ...value,
      recurrenceRule: {
        frequency: rule?.frequency ?? 'weekly',
        interval: n,
        byWeekday: rule?.byWeekday ?? [],
        until: rule?.until ?? null,
        count: rule?.count ?? null,
      },
    });
  };

  const handleFrequencyChange = (freq: 'daily' | 'weekly') => {
    onChange({
      ...value,
      recurrenceRule: {
        frequency: freq,
        interval: rule?.interval ?? 1,
        byWeekday: rule?.byWeekday ?? [],
        until: rule?.until ?? null,
        count: rule?.count ?? null,
      },
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase text-slate-600">Частота</div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => handleFrequencyChange('daily')}
              className={modeButtonClasses(rule?.frequency === 'daily')}
            >
              Ежедневно
            </button>
            <button
              type="button"
              onClick={() => handleFrequencyChange('weekly')}
              className={modeButtonClasses(rule?.frequency !== 'daily')}
            >
              Еженедельно
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase text-slate-600">Интервал</div>
          <input
            type="number"
            min={1}
            value={rule?.interval ?? 1}
            onChange={(e) => handleIntervalChange(Number(e.target.value) || 1)}
            className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-0"
          />
        </div>
      </div>
    </div>
  );
}

export interface StartsAtListProps {
  startsAtList: string[];
  onChange: (next: string[]) => void;
}

export function StartsAtList({ startsAtList, onChange }: StartsAtListProps) {
  const handleAdd = () => {
    onChange([...startsAtList, '']);
  };

  const handleChange = (index: number, value: string) => {
    const next = [...startsAtList];
    next[index] = value;
    onChange(next);
  };

  const handleRemove = (index: number) => {
    onChange(startsAtList.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-medium text-slate-800">Стартовые даты/время</label>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
        >
          Добавить слот
        </button>
      </div>
      <div className="space-y-2">
        {startsAtList.slice(0, 5).map((start, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => handleChange(index, e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50"
            >
              ✕
            </button>
          </div>
        ))}
        {startsAtList.length > 5 && (
          <p className="text-xs text-slate-500">
            Показано первых {Math.min(5, startsAtList.length)} слотов из {startsAtList.length}.
          </p>
        )}
        {startsAtList.length === 0 && (
          <p className="text-xs text-slate-500">Пока нет добавленных времён начала.</p>
        )}
      </div>
    </div>
  );
}

export interface ScheduleExceptionsEditorProps {
  value: EventWizardScheduleDraft;
  onChange: (next: EventWizardScheduleDraft) => void;
}

export function ScheduleExceptionsEditor({ value, onChange }: ScheduleExceptionsEditorProps) {
  const handleRemovedChange = (index: number, v: string) => {
    const next = [...value.exceptions.removedStartsAt];
    next[index] = v;
    onChange({ ...value, exceptions: { ...value.exceptions, removedStartsAt: next } });
  };

  const handleAddRemoved = () => {
    onChange({
      ...value,
      exceptions: { ...value.exceptions, removedStartsAt: [...value.exceptions.removedStartsAt, ''] },
    });
  };

  return (
    <div className="rounded-xl border bg-white px-4 py-4 sm:px-6 sm:py-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Исключения</h2>
        <p className="mt-1 text-xs text-slate-500">
          Уберите или перенесите отдельные вхождения, не создавая тяжёлых отдельных сессий.
        </p>
      </div>
      <div className="space-y-3 text-xs">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-800">Удалённые слоты</span>
            <button
              type="button"
              onClick={handleAddRemoved}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              Добавить
            </button>
          </div>
          <div className="space-y-2">
            {value.exceptions.removedStartsAt.map((s, idx) => (
              <input
                key={idx}
                type="datetime-local"
                value={s}
                onChange={(e) => handleRemovedChange(idx, e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
              />
            ))}
            {value.exceptions.removedStartsAt.length === 0 && (
              <p className="text-xs text-slate-500">Пока нет исключённых слотов.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildScheduleSummary(schedule: EventWizardScheduleDraft): string {
  const count = schedule.startsAtList.length;
  if (count === 0) {
    return 'Расписание ещё не заполнено.';
  }

  const base =
    schedule.mode === 'single'
      ? 'Одиночное событие'
      : schedule.mode === 'recurring'
      ? 'Повторяющееся событие'
      : 'Несколько дат';

  const nextPreview = schedule.startsAtList
    .slice()
    .sort()
    .slice(0, 3)
    .map((iso) => iso)
    .join(', ');

  const exceptionsCount =
    schedule.exceptions.removedStartsAt.length + schedule.exceptions.movedStartsAt.length;

  return [
    base,
    `слотов: ${count}`,
    nextPreview ? `ближайшие: ${nextPreview}` : null,
    exceptionsCount > 0 ? `исключений/переносов: ${exceptionsCount}` : null,
  ]
    .filter(Boolean)
    .join(' • ');
}

