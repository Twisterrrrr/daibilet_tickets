import { useMemo, useState } from 'react';

import type {
  EventWizardDraft,
  EventWizardMode,
  EventWizardStepKey,
  EventWizardTicketsDraft,
  EventWizardCapacityDraft,
  EventWizardPublishingDraft,
} from './EventWizard.types';
import {
  validateBasics,
  validateCapacity,
  validateSchedule,
  validateTickets,
  validatePublishing,
} from './EventWizard.validation';
import { EventBasicsStep } from './EventBasicsStep';
import { ScheduleStep } from './EventScheduleStep';
import { TicketsPricingStep } from './TicketsPricingStep';
import { CapacityAvailabilityStep } from './CapacityAvailabilityStep';
import { PublishReviewStep } from './PublishReviewStep';
import {
  WorkflowContainer,
  WorkflowNavigation,
  WorkflowSidebar,
  type WorkflowSidebarStep,
  ValidationSummary,
} from '../WorkflowShell';

export interface EventWizardProps {
  initialDraft: EventWizardDraft;
  mode: EventWizardMode;
  onDraftChange?: (draft: EventWizardDraft) => void;
  onSubmit?: (draft: EventWizardDraft, options?: { action?: 'create' | 'saveDraft' | 'update' }) => void;
}

export function EventWizard({ initialDraft, mode, onDraftChange, onSubmit }: EventWizardProps) {
  const [draft, setDraft] = useState<EventWizardDraft>(initialDraft);
  const [currentStep, setCurrentStep] = useState<EventWizardStepKey>('basics');
  const [isDirty, setIsDirty] = useState(false);

  const allIssues = useMemo(() => {
    return [
      ...validateBasics(draft.basics),
      ...validateSchedule(draft.schedule),
      ...validateTickets(draft.tickets as EventWizardTicketsDraft),
      ...validateCapacity(draft.capacity as EventWizardCapacityDraft, draft.tickets as EventWizardTicketsDraft),
      ...validatePublishing(draft.publishing as EventWizardPublishingDraft),
    ];
  }, [draft]);

  const stepOrder: EventWizardStepKey[] = useMemo(
    () => ['basics', 'schedule', 'ticketsPricing', 'capacity', 'publish'],
    [],
  );

  const steps: WorkflowSidebarStep[] = useMemo(() => {
    return stepOrder.map<WorkflowSidebarStep>((key) => {
      const stepIssues = allIssues.filter((i) => i.step === key);
      const hasError = stepIssues.some((i) => i.severity === 'error');
      const hasWarning = stepIssues.some((i) => i.severity === 'warning');

      let status: WorkflowSidebarStep['status'] = 'idle';
      if (key === currentStep) status = 'active';
      else if (hasError) status = 'error';
      else if (!hasError && stepIssues.length > 0) status = 'completed';

      const labelMap: Record<EventWizardStepKey, string> = {
        basics: 'Базовая информация',
        schedule: 'Расписание',
        ticketsPricing: 'Билеты и цены',
        capacity: 'Вместимость',
        publish: 'Публикация',
      };

      return {
        key,
        label: labelMap[key],
        description: hasError ? 'Есть ошибки' : hasWarning ? 'Есть предупреждения' : undefined,
        status,
      };
    });
  }, [allIssues, currentStep, stepOrder]);

  const updateDraft = (next: EventWizardDraft) => {
    setDraft(next);
    if (!isDirty) {
      setIsDirty(true);
    }
    onDraftChange?.(next);
  };

  const goToStep = (key: EventWizardStepKey) => {
    setCurrentStep(key);
  };

  const goNext = () => {
    const idx = stepOrder.indexOf(currentStep);
    if (idx >= 0 && idx < stepOrder.length - 1) {
      setCurrentStep(stepOrder[idx + 1]);
    } else if (idx === stepOrder.length - 1) {
      onSubmit?.(draft, { action: mode === 'create' ? 'create' : 'update' });
    }
  };

  const handleSaveDraft = () => {
    if (mode !== 'create') return;
    onSubmit?.(draft, { action: 'saveDraft' });
    setIsDirty(false);
  };

  const goBack = () => {
    const idx = stepOrder.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(stepOrder[idx - 1]);
    }
  };

  const stepContent = (() => {
    switch (currentStep) {
      case 'basics':
        return (
          <EventBasicsStep
            value={draft.basics}
            onChange={(nextBasics) => updateDraft({ ...draft, basics: nextBasics })}
            sourceMeta={draft.sourceMeta}
          />
        );
      case 'schedule':
        return (
          <ScheduleStep
            value={draft.schedule}
            onChange={(nextSchedule) => updateDraft({ ...draft, schedule: nextSchedule })}
          />
        );
      case 'ticketsPricing':
        return (
          <TicketsPricingStep
            value={draft.tickets as EventWizardTicketsDraft}
            onChange={(nextTickets) => updateDraft({ ...draft, tickets: nextTickets })}
          />
        );
      case 'capacity':
        return (
          <CapacityAvailabilityStep
            value={draft.capacity as EventWizardCapacityDraft}
            tickets={draft.tickets as EventWizardTicketsDraft}
            onChange={(nextCapacity) => updateDraft({ ...draft, capacity: nextCapacity })}
          />
        );
      case 'publish':
        return (
          <PublishReviewStep draft={draft} />
        );
      default:
        return null;
    }
  })();

  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <WorkflowContainer
      sidebar={(
        <WorkflowSidebar
          steps={steps}
          currentStep={currentStep}
          onStepClick={goToStep}
        />
      )}
    >
      <div className="space-y-4">
        <ValidationSummary issues={allIssues.filter((i) => i.severity === 'error')} />
        {stepContent}
      </div>
      <WorkflowNavigation
        canGoBack={currentIndex > 0}
        canGoNext
        isLastStep={currentIndex === stepOrder.length - 1}
        onBack={goBack}
        onNext={goNext}
        primaryLabel={currentIndex === stepOrder.length - 1 ? (mode === 'create' ? 'Создать событие' : 'Сохранить') : 'Далее'}
        secondaryActionLabel={mode === 'create' ? 'Сохранить черновик' : undefined}
        onSecondaryAction={mode === 'create' ? handleSaveDraft : undefined}
        secondaryActionDisabled={!isDirty}
      />
    </WorkflowContainer>
  );
}

