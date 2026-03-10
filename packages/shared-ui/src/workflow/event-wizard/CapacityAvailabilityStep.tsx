import type { ChangeEvent } from 'react';

import type { EventWizardCapacityDraft, EventWizardTicketsDraft } from './EventWizard.types';

export interface CapacityAvailabilityStepProps {
  value: EventWizardCapacityDraft;
  tickets: EventWizardTicketsDraft;
  onChange: (next: EventWizardCapacityDraft) => void;
}

export function CapacityAvailabilityStep({ value, tickets, onChange }: CapacityAvailabilityStepProps) {
  const handleField =
    (key: keyof EventWizardCapacityDraft) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      let v: unknown = e.target.value;
      if (key === 'eventCapacity' || key === 'holdTimeoutMinutes') {
        const num = e.target.value === '' ? null : Number(e.target.value);
        v = num === null || Number.isFinite(num) ? num : null;
      }
      if (key === 'perSessionCapacityEnabled' || key === 'oversellAllowed') {
        v = e.target.checked;
      }
      onChange({ ...value, [key]: v } as EventWizardCapacityDraft);
    };

  const totalTierLimit = tickets.tiers
    .map((t) => t.quantityLimit ?? 0)
    .reduce((acc, v) => acc + v, 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Вместимость и доступность</h2>
          <p className="mt-1 text-xs text-slate-500">
            Настройте высокоуровневую политику вместимости. Конкретное распределение по сеансам останется задачей
            адаптера поверх текущих session‑API.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">Общая вместимость события</label>
            <input
              type="number"
              min={0}
              value={value.eventCapacity ?? ''}
              onChange={handleField('eventCapacity')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
              placeholder="Не ограничено"
            />
            <p className="text-[11px] text-slate-500">
              Если оставить пустым, вместимость будет ограничиваться только наличием билетов и сессий.
            </p>
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">Время холда (мин)</label>
            <input
              type="number"
              min={0}
              value={value.holdTimeoutMinutes ?? ''}
              onChange={handleField('holdTimeoutMinutes')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-0"
              placeholder="Напр. 15"
            />
            <p className="text-[11px] text-slate-500">
              Сколько минут бронь держится без оплаты, прежде чем билеты вернутся в продажу.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 text-xs">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={value.perSessionCapacityEnabled}
              onChange={handleField('perSessionCapacityEnabled')}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>
              <span className="block text-[11px] font-medium text-slate-700">Вместимость на уровне сеансов</span>
              <span className="block text-[11px] text-slate-500">
                Если включено, capacity будет задаваться и контролироваться на уровне отдельных сессий.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={value.oversellAllowed}
              onChange={handleField('oversellAllowed')}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>
              <span className="block text-[11px] font-medium text-slate-700">Разрешить oversell</span>
              <span className="block text-[11px] text-slate-500">
                В редких случаях, когда бизнес допускает продажу сверх номинальной вместимости.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="rounded-xl border bg-white px-4 py-4 text-xs text-slate-600 sm:px-6 sm:py-5">
        <div className="mb-1 font-semibold text-slate-800">Подсказки по доступности</div>
        <p className="mb-1">
          Суммарный лимит по типам билетов: <span className="font-medium">{totalTierLimit || '—'}</span>
        </p>
        {value.eventCapacity != null && value.eventCapacity > 0 && totalTierLimit > value.eventCapacity && (
          <p className="text-[11px] text-amber-700">
            Лимиты по типам билетов превышают общую вместимость события. Это не запрещено, но может привести к
            неожиданному UX для покупателей.
          </p>
        )}
        {(!value.eventCapacity || value.eventCapacity <= 0) && totalTierLimit === 0 && (
          <p className="text-[11px] text-slate-500">
            Вы пока не задали явных ограничений по вместимости. Это допустимо на ранних стадиях, но перед запуском
            продаж стоит определить хотя бы желаемую нагрузку.
          </p>
        )}
      </div>
    </div>
  );
}

