import type { ChangeEvent } from 'react';

import type { EventWizardTicketsDraft, EventWizardTicketTierDraft } from './EventWizard.types';

export interface TicketsPricingStepProps {
  value: EventWizardTicketsDraft;
  onChange: (next: EventWizardTicketsDraft) => void;
}

export function TicketsPricingStep({ value, onChange }: TicketsPricingStepProps) {
  const handleTierChange = (index: number, patch: Partial<EventWizardTicketTierDraft>) => {
    const next = value.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier));
    onChange({ ...value, tiers: next });
  };

  const handleAddTier = () => {
    const newTier: EventWizardTicketTierDraft = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      priceMinor: 0,
      currency: value.currency,
      quantityLimit: null,
      purchaseType: 'REQUEST',
      deeplink: null,
      commissionPercent: null,
      availabilityMode: null,
      badge: null,
      isPrimary: value.tiers.length === 0,
    };
    onChange({ ...value, tiers: [...value.tiers, newTier] });
  };

  const handleRemoveTier = (index: number) => {
    const removed = value.tiers[index];
    const next = value.tiers.filter((_, i) => i !== index);
    // Если удалили primary — пометим первый оставшийся как primary
    if (removed?.isPrimary && next.length > 0) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange({ ...value, tiers: next });
  };

  const handleDuplicateTier = (index: number) => {
    const original = value.tiers[index];
    if (!original) return;
    const copy: EventWizardTicketTierDraft = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (копия)`,
      isPrimary: false,
    };
    const next = [...value.tiers];
    next.splice(index + 1, 0, copy);
    onChange({ ...value, tiers: next });
  };

  const handlePrimaryChange = (index: number) => {
    const next = value.tiers.map((tier, i) => ({ ...tier, isPrimary: i === index }));
    onChange({ ...value, tiers: next });
  };

  const handlePricingModeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, pricingMode: e.target.value as EventWizardTicketsDraft['pricingMode'] });
  };

  const handleServiceFeeModeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, serviceFeeMode: e.target.value as EventWizardTicketsDraft['serviceFeeMode'] });
  };

  const handleCurrencyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const currency = e.target.value;
    onChange({
      ...value,
      currency,
      tiers: value.tiers.map((tier) => ({ ...tier, currency })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Билеты и цены</h2>
          <p className="mt-1 text-xs text-slate-500">
            Настройте типы билетов и общую ценовую политику события. Все правила применяются на уровне события,
            а не отдельных слотов/сеансов.
          </p>
        </div>

        <PricingRulesEditor
          pricingMode={value.pricingMode}
          serviceFeeMode={value.serviceFeeMode}
          currency={value.currency}
          onPricingModeChange={handlePricingModeChange}
          onServiceFeeModeChange={handleServiceFeeModeChange}
          onCurrencyChange={handleCurrencyChange}
        />

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-800">Типы билетов / офферы</span>
            <button
              type="button"
              onClick={handleAddTier}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            >
              Добавить тип
            </button>
          </div>

          <div className="space-y-3">
            {value.tiers.map((tier, index) => (
              <TicketTierEditor
                key={tier.id}
                tier={tier}
                isPrimary={tier.isPrimary}
                onChange={(patch) => handleTierChange(index, patch)}
                onRemove={() => handleRemoveTier(index)}
                onDuplicate={() => handleDuplicateTier(index)}
                onPrimary={() => handlePrimaryChange(index)}
              />
            ))}
            {value.tiers.length === 0 && (
              <p className="text-xs text-slate-500">
                Пока нет ни одного типа билета. Добавьте хотя бы один, чтобы событие можно было опубликовать.
              </p>
            )}
          </div>
        </div>
      </div>

      <QuotaRulesEditor value={value} />
    </div>
  );
}

export interface TicketTierEditorProps {
  tier: EventWizardTicketTierDraft;
  isPrimary: boolean;
  onChange: (patch: Partial<EventWizardTicketTierDraft>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onPrimary: () => void;
}

export function TicketTierEditor({
  tier,
  isPrimary,
  onChange,
  onRemove,
  onDuplicate,
  onPrimary,
}: TicketTierEditorProps) {
  const handleField =
    (key: keyof EventWizardTicketTierDraft) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      let value: unknown = e.target.value;
      if (key === 'priceMinor' || key === 'quantityLimit' || key === 'commissionPercent') {
        const num = e.target.value === '' ? 0 : Number(e.target.value);
        value = Number.isFinite(num) ? num : 0;
      }
      onChange({ [key]: value } as Partial<EventWizardTicketTierDraft>);
    };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            type="radio"
            checked={isPrimary}
            onChange={onPrimary}
            className="h-3 w-3 accent-slate-900"
          />
          <span className="font-semibold text-slate-800">
            {tier.name || 'Новый тип билета'}
          </span>
          {isPrimary && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white">Основной</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-100"
          >
            Дублировать
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100"
          >
            Удалить
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-700">Название</label>
          <input
            value={tier.name}
            onChange={handleField('name')}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-0"
            placeholder="Взрослый"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-700">Цена ({tier.currency})</label>
          <input
            type="number"
            min={0}
            value={tier.priceMinor ? (tier.priceMinor / 100).toFixed(0) : ''}
            onChange={(e) => {
              const rub = e.target.value === '' ? 0 : Number(e.target.value);
              const priceMinor = Math.max(0, Math.round(rub * 100));
              onChange({ priceMinor });
            }}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-0"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-700">Лимит билетов</label>
          <input
            type="number"
            min={0}
            value={tier.quantityLimit ?? ''}
            onChange={handleField('quantityLimit')}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-0"
            placeholder="Неограниченно"
          />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-[11px] font-medium text-slate-700">Описание</label>
          <textarea
            value={tier.description}
            onChange={handleField('description')}
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-0"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-700">Тип покупки</label>
          <select
            value={tier.purchaseType}
            onChange={handleField('purchaseType')}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-0"
          >
            <option value="REQUEST">Заявка</option>
            <option value="REDIRECT">Внешняя ссылка</option>
            <option value="WIDGET">Виджет</option>
          </select>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-[11px] font-medium text-slate-700">Deeplink</label>
          <input
            value={tier.deeplink ?? ''}
            onChange={handleField('deeplink')}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-0"
            placeholder="https://..."
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-700">Комиссия, %</label>
          <input
            type="number"
            min={0}
            max={100}
            value={tier.commissionPercent ?? ''}
            onChange={handleField('commissionPercent')}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-0"
          />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-700">Доступность</label>
          <select
            value={tier.availabilityMode ?? ''}
            onChange={handleField('availabilityMode')}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-0"
          >
            <option value="">По умолчанию</option>
            <option value="UNKNOWN">Неизвестно</option>
            <option value="LIMITED">Ограничено</option>
            <option value="SOLD_OUT">Распродано</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-slate-700">Бейдж</label>
          <select
            value={tier.badge ?? ''}
            onChange={handleField('badge')}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-0"
          >
            <option value="">Без бейджа</option>
            <option value="optimal">Оптимальный</option>
            <option value="cheapest">Дешевле</option>
            <option value="fastest">Быстрее</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export interface PricingRulesEditorProps {
  pricingMode: EventWizardTicketsDraft['pricingMode'];
  serviceFeeMode: EventWizardTicketsDraft['serviceFeeMode'];
  currency: string;
  onPricingModeChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  onServiceFeeModeChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  onCurrencyChange: (e: ChangeEvent<HTMLSelectElement>) => void;
}

export function PricingRulesEditor({
  pricingMode,
  serviceFeeMode,
  currency,
  onPricingModeChange,
  onServiceFeeModeChange,
  onCurrencyChange,
}: PricingRulesEditorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3 text-xs">
      <div className="space-y-1">
        <label className="block text-[11px] font-medium text-slate-700">Режим ценообразования</label>
        <select
          value={pricingMode}
          onChange={onPricingModeChange}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-0"
        >
          <option value="fixed">Фиксированная цена</option>
          <option value="tiered">Несколько типов билетов</option>
          <option value="dynamic">Динамическая цена</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="block text-[11px] font-medium text-slate-700">Сервисный сбор</label>
        <select
          value={serviceFeeMode}
          onChange={onServiceFeeModeChange}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-0"
        >
          <option value="included">Включён в цену</option>
          <option value="added">Добавляется сверху</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="block text-[11px] font-medium text-slate-700">Валюта</label>
        <select
          value={currency}
          onChange={onCurrencyChange}
          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-400 focus:ring-0"
        >
          <option value="RUB">RUB</option>
        </select>
      </div>
    </div>
  );
}

export interface QuotaRulesEditorProps {
  value: EventWizardTicketsDraft;
}

export function QuotaRulesEditor({ value }: QuotaRulesEditorProps) {
  const totalLimit = value.tiers
    .map((t) => t.quantityLimit ?? 0)
    .reduce((acc, v) => acc + v, 0);

  return (
    <div className="rounded-xl border bg-white px-4 py-4 text-xs text-slate-600 sm:px-6 sm:py-5">
      <div className="mb-2 font-semibold text-slate-800">Квоты и ограничения</div>
      <p className="mb-1">
        Суммарный лимит по типам билетов: <span className="font-medium">{totalLimit || '—'}</span>
      </p>
      <p className="text-[11px] text-slate-500">
        Фактические ограничения по вместимости будут рассчитаны адаптером на уровне сеансов, но этот шаг позволяет
        задать желаемую квоту на уровне события.
      </p>
    </div>
  );
}

