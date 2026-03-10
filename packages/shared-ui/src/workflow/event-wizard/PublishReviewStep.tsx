import type { EventWizardDraft } from './EventWizard.types';

import { ValidationSummary } from '../WorkflowShell';
import { validateWizardForPublish } from './EventWizard.validation';

export interface PublishReviewStepProps {
  draft: EventWizardDraft;
}

export function PublishReviewStep({ draft }: PublishReviewStepProps) {
  const issues = validateWizardForPublish(draft);

  return (
    <div className="space-y-6">
      <PublishPanel draft={draft} />
      <PreviewPanel draft={draft} />
      <ValidationSummary issues={issues} />
    </div>
  );
}

export interface PublishPanelProps {
  draft: EventWizardDraft;
}

export function PublishPanel({ draft }: PublishPanelProps) {
  const { publishing } = draft;

  return (
    <div className="rounded-xl border bg-white px-4 py-4 sm:px-6 sm:py-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Готовность к публикации</h2>
        <p className="mt-1 text-xs text-slate-500">
          Проверьте сводку по событию перед тем, как отправлять его в продажу или на модерацию.
        </p>
      </div>
      <dl className="grid gap-3 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Статус</dt>
          <dd className="font-medium text-slate-900">
            {publishing.status === 'draft'
              ? 'Черновик'
              : publishing.status === 'ready'
              ? 'Готово к публикации'
              : 'Опубликовано'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Видимость</dt>
          <dd className="font-medium text-slate-900">
            {publishing.visibility === 'hidden' ? 'Скрыто из выдачи' : 'Отображается в каталоге'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Заметки модерации</dt>
          <dd className="font-medium text-slate-900">
            {publishing.moderationNotes ? publishing.moderationNotes.slice(0, 80) : 'Нет'}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export interface PreviewPanelProps {
  draft: EventWizardDraft;
}

export function PreviewPanel({ draft }: PreviewPanelProps) {
  const { basics, schedule, tickets, capacity } = draft;

  const occurrencesCount = schedule.startsAtList.length;
  const nextPreview = schedule.startsAtList
    .slice()
    .sort()
    .slice(0, 3);
  const exceptionsCount =
    schedule.exceptions.removedStartsAt.length + schedule.exceptions.movedStartsAt.length;

  return (
    <div className="rounded-xl border bg-white px-4 py-4 text-xs text-slate-700 sm:px-6 sm:py-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Сводка</h2>
        <p className="mt-1 text-xs text-slate-500">
          Краткий обзор того, как событие будет выглядеть и работать для пользователей.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Базовая информация</h3>
          <p className="text-sm font-semibold text-slate-900">{basics.title || 'Без названия'}</p>
          <p className="text-xs text-slate-600">
            Категория: <span className="font-medium">{basics.category || '—'}</span> • Город:{' '}
            <span className="font-medium">{basics.cityId || '—'}</span>
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Расписание</h3>
          <p className="text-xs text-slate-700">
            {schedule.mode === 'single'
              ? 'Одиночное событие'
              : schedule.mode === 'recurring'
              ? 'Повторяющееся событие'
              : 'Несколько дат вручную'}
          </p>
          <p className="text-xs text-slate-700">
            Всего стартов: <span className="font-medium">{occurrencesCount}</span>
          </p>
          {nextPreview.length > 0 && (
            <p className="text-xs text-slate-700">
              Ближайшие:{' '}
              <span className="font-mono text-[11px]">
                {nextPreview.join(', ')}
              </span>
            </p>
          )}
          {exceptionsCount > 0 && (
            <p className="text-xs text-slate-700">
              Исключений/переносов: <span className="font-medium">{exceptionsCount}</span>
            </p>
          )}
        </section>

        <section className="space-y-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Билеты и цены</h3>
          <p className="text-xs text-slate-700">
            Типов билетов: <span className="font-medium">{tickets.tiers.length}</span> • Режим:{' '}
            <span className="font-medium">
              {tickets.pricingMode === 'fixed'
                ? 'Фиксированная цена'
                : tickets.pricingMode === 'tiered'
                ? 'Несколько типов'
                : 'Динамическая цена'}
            </span>
          </p>
          {tickets.tiers.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {tickets.tiers.slice(0, 3).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate">{t.name || 'Без названия'}</span>
                  <span className="whitespace-nowrap font-mono text-[11px]">
                    {(t.priceMinor / 100).toFixed(0)} {t.currency}
                  </span>
                </li>
              ))}
              {tickets.tiers.length > 3 && (
                <li className="text-[11px] text-slate-500">
                  и ещё {tickets.tiers.length - 3} типов билетов...
                </li>
              )}
            </ul>
          )}
        </section>

        <section className="space-y-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Вместимость</h3>
          <p className="text-xs text-slate-700">
            Общая вместимость:{' '}
            <span className="font-medium">
              {capacity.eventCapacity != null && capacity.eventCapacity > 0 ? capacity.eventCapacity : 'не задана'}
            </span>
          </p>
          <p className="text-xs text-slate-700">
            Режим на уровне сеансов:{' '}
            <span className="font-medium">
              {capacity.perSessionCapacityEnabled ? 'включён' : 'выключен'}
            </span>
          </p>
          <p className="text-xs text-slate-700">
            Oversell:{' '}
            <span className="font-medium">
              {capacity.oversellAllowed ? 'разрешён' : 'запрещён'}
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}

