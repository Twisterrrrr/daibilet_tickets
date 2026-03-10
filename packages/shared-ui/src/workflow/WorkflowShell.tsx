import type { ReactNode } from 'react';
import { clsx } from 'clsx';

import type { EventWizardStepKey, EventWizardValidationIssue } from './event-wizard/EventWizard.types';

export interface WorkflowContainerProps {
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
}

export function WorkflowContainer({ sidebar, children, className }: WorkflowContainerProps) {
  return (
    <div className={clsx('flex gap-6', className)}>
      <aside className="w-64 shrink-0">
        {sidebar}
      </aside>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

export interface WorkflowSidebarStep {
  key: EventWizardStepKey;
  label: string;
  description?: string;
  status: 'idle' | 'active' | 'completed' | 'error';
}

export interface WorkflowSidebarProps {
  steps: WorkflowSidebarStep[];
  currentStep: EventWizardStepKey;
  onStepClick?: (key: EventWizardStepKey) => void;
}

export function WorkflowSidebar({ steps, currentStep, onStepClick }: WorkflowSidebarProps) {
  return (
    <nav className="space-y-1 text-sm">
      {steps.map((step) => {
        const isActive = step.key === currentStep;
        const isCompleted = step.status === 'completed';
        const isError = step.status === 'error';

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepClick?.(step.key)}
            className={clsx(
              'flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors',
              isActive && 'bg-slate-900 text-white',
              !isActive && !isError && !isCompleted && 'text-slate-700 hover:bg-slate-100',
              isCompleted && !isActive && 'text-emerald-700 hover:bg-emerald-50',
              isError && !isActive && 'text-red-700 hover:bg-red-50',
            )}
          >
            <span className="mt-1 h-2 w-2 rounded-full border border-current">
              {isCompleted && !isError && (
                <span className="block h-full w-full rounded-full bg-current" />
              )}
            </span>
            <span className="flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide">
                {step.label}
              </span>
              {step.description && (
                <span className={clsx('mt-0.5 block text-[11px]', isActive ? 'text-slate-200' : 'text-slate-500')}>
                  {step.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export interface WorkflowNavigationProps {
  canGoBack: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
  onBack?: () => void;
  onNext?: () => void;
  onCancel?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionDisabled?: boolean;
  className?: string;
}

export function WorkflowNavigation({
  canGoBack,
  canGoNext,
  isLastStep,
  onBack,
  onNext,
  onCancel,
  primaryLabel,
  secondaryLabel,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionDisabled,
  className,
}: WorkflowNavigationProps) {
  return (
    <div
      className={clsx(
        'sticky bottom-0 left-0 right-0 -mx-6 mt-6 border-t bg-white/95 px-6 py-4 backdrop-blur',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Отмена
            </button>
          )}
          {secondaryLabel && onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={!canGoBack}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onBack && !secondaryLabel && (
            <button
              type="button"
              onClick={onBack}
              disabled={!canGoBack}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Назад
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              disabled={secondaryActionDisabled}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {secondaryActionLabel}
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={!canGoNext}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {primaryLabel ?? (isLastStep ? 'Завершить' : 'Далее')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export interface ValidationSummaryProps {
  issues: EventWizardValidationIssue[];
}

export function ValidationSummary({ issues }: ValidationSummaryProps) {
  if (!issues.length) return null;

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
      <div className="mb-1 font-semibold">
        Обнаружены проблемы: {errors.length} ошибок, {warnings.length} предупреждений
      </div>
      <ul className="space-y-0.5">
        {issues.slice(0, 6).map((i, idx) => (
          <li key={`${i.step}-${i.code}-${idx}`} className="flex items-start gap-1.5">
            <span className="mt-[2px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
            <span>
              <span className="font-medium">{i.step}</span>: {i.message}
            </span>
          </li>
        ))}
        {issues.length > 6 && (
          <li className="mt-1 text-[11px] text-amber-800">
            И ещё {issues.length - 6} вопросов — откройте шаги визарда, чтобы увидеть детали.
          </li>
        )}
      </ul>
    </div>
  );
}

