import type {
  EventWizardDraft,
  EventWizardBasicsDraft,
  EventWizardScheduleDraft,
  EventWizardTicketsDraft,
  EventWizardCapacityDraft,
  EventWizardPublishingDraft,
  EventWizardValidationIssue,
  EventWizardStepKey,
} from './EventWizard.types';

function issue(
  step: EventWizardStepKey,
  code: string,
  message: string,
  severity: EventWizardValidationIssue['severity'] = 'error',
  field?: string,
): EventWizardValidationIssue {
  return { step, code, message, severity, field };
}

// ────────────────────────────────────────────────────────────
// Basics
// ────────────────────────────────────────────────────────────

export function validateBasics(basics: EventWizardBasicsDraft): EventWizardValidationIssue[] {
  const issues: EventWizardValidationIssue[] = [];
  const step: EventWizardStepKey = 'basics';

  if (!basics.title.trim()) {
    issues.push(issue(step, 'TITLE_REQUIRED', 'Название события обязательно', 'error', 'title'));
  }

  if (!basics.cityId) {
    issues.push(issue(step, 'CITY_REQUIRED', 'Не выбран город', 'error', 'cityId'));
  }

  if (!basics.category) {
    issues.push(issue(step, 'CATEGORY_REQUIRED', 'Не выбрана категория события', 'error', 'category'));
  }

  if (!basics.slug.trim()) {
    issues.push(issue(step, 'SLUG_MISSING', 'Slug не задан — будет сгенерирован автоматически', 'warning', 'slug'));
  }

  return issues;
}

// ────────────────────────────────────────────────────────────
// Schedule
// ────────────────────────────────────────────────────────────

export function validateSchedule(schedule: EventWizardScheduleDraft): EventWizardValidationIssue[] {
  const issues: EventWizardValidationIssue[] = [];
  const step: EventWizardStepKey = 'schedule';

  const uniqueStarts = Array.from(new Set(schedule.startsAtList));

  if (uniqueStarts.length === 0) {
    issues.push(
      issue(
        step,
        'NO_STARTS',
        'Нужно указать хотя бы одно время начала события (слот)',
        'error',
        'startsAtList',
      ),
    );
  }

  if (uniqueStarts.length !== schedule.startsAtList.length) {
    issues.push(
      issue(
        step,
        'DUPLICATE_STARTS',
        'В расписании есть дублирующиеся времена начала — проверьте слоты',
        'error',
        'startsAtList',
      ),
    );
  }

  if (schedule.mode === 'recurring' && schedule.recurrenceRule) {
    const { interval, byWeekday, count, until } = schedule.recurrenceRule;

    if (!interval || interval <= 0) {
      issues.push(
        issue(step, 'RECURRENCE_INTERVAL_INVALID', 'Интервал повторения должен быть положительным числом', 'error'),
      );
    }

    if (!Array.isArray(byWeekday) || byWeekday.length === 0) {
      issues.push(
        issue(
          step,
          'RECURRENCE_WEEKDAYS_EMPTY',
          'Нужно выбрать хотя бы один день недели для повторяющегося события',
          'error',
        ),
      );
    }

    if (count != null && count <= 0) {
      issues.push(
        issue(
          step,
          'RECURRENCE_COUNT_INVALID',
          'Количество повторений должно быть больше нуля или не задано',
          'error',
        ),
      );
    }

    if (!count && !until) {
      issues.push(
        issue(
          step,
          'RECURRENCE_OPEN_ENDED',
          'Рекомендуется задать либо дату окончания, либо количество повторений для recurring‑события',
          'warning',
        ),
      );
    }
  }

  // Moved occurrences must not collide with existing starts
  const movedCollisions = new Set<string>();
  for (const move of schedule.exceptions.movedStartsAt) {
    if (uniqueStarts.includes(move.to)) {
      movedCollisions.add(move.to);
    }
  }
  if (movedCollisions.size > 0) {
    issues.push(
      issue(
        step,
        'MOVED_OCCURRENCE_COLLISION',
        'Некоторые перенесённые слоты пересекаются с уже существующими временами начала',
        'error',
        'exceptions',
      ),
    );
  }

  // Sales policy coherence
  const { salesStartAt, salesEndAt, stopSalesBeforeMinutes } = schedule.salesPolicy;
  if (salesStartAt && salesEndAt && salesStartAt > salesEndAt) {
    issues.push(
      issue(
        step,
        'SALES_RANGE_INVALID',
        'Дата начала продаж позже даты окончания — проверьте период продаж',
        'error',
        'salesPolicy',
      ),
    );
  }
  if (stopSalesBeforeMinutes != null && stopSalesBeforeMinutes < 0) {
    issues.push(
      issue(
        step,
        'STOP_SALES_BEFORE_INVALID',
        'Значение "остановить продажи за N минут" не может быть отрицательным',
        'error',
        'salesPolicy',
      ),
    );
  }

  return issues;
}

// ────────────────────────────────────────────────────────────
// Tickets & Pricing
// ────────────────────────────────────────────────────────────

export function validateTickets(tickets: EventWizardTicketsDraft): EventWizardValidationIssue[] {
  const issues: EventWizardValidationIssue[] = [];
  const step: EventWizardStepKey = 'ticketsPricing';

  if (!tickets.tiers.length) {
    issues.push(
      issue(
        step,
        'NO_TIERS',
        'Нужно добавить хотя бы один тип билета или оффера перед публикацией события',
        'error',
        'tiers',
      ),
    );
  }

  tickets.tiers.forEach((tier, idx) => {
    const prefix = `tiers[${idx}]`;

    if (!tier.name.trim()) {
      issues.push(issue(step, 'TIER_NAME_REQUIRED', 'Укажите название типа билета', 'error', `${prefix}.name`));
    }

    if (tier.priceMinor <= 0) {
      issues.push(issue(step, 'TIER_PRICE_INVALID', 'Цена билета должна быть больше нуля', 'error', `${prefix}.priceMinor`));
    }

    if (tier.quantityLimit != null && tier.quantityLimit <= 0) {
      issues.push(
        issue(
          step,
          'TIER_QUANTITY_INVALID',
          'Лимит билетов должен быть больше нуля или не задаваться вовсе',
          'error',
          `${prefix}.quantityLimit`,
        ),
      );
    }
  });

  return issues;
}

// ────────────────────────────────────────────────────────────
// Capacity
// ────────────────────────────────────────────────────────────

export function validateCapacity(capacity: EventWizardCapacityDraft, tickets: EventWizardTicketsDraft): EventWizardValidationIssue[] {
  const issues: EventWizardValidationIssue[] = [];
  const step: EventWizardStepKey = 'capacity';

  if (capacity.eventCapacity != null && capacity.eventCapacity <= 0) {
    issues.push(
      issue(
        step,
        'EVENT_CAPACITY_INVALID',
        'Общая вместимость события должна быть больше нуля или не задаваться',
        'error',
        'eventCapacity',
      ),
    );
  }

  if (capacity.holdTimeoutMinutes != null && capacity.holdTimeoutMinutes < 0) {
    issues.push(
      issue(
        step,
        'HOLD_TIMEOUT_INVALID',
        'Время холда не может быть отрицательным',
        'error',
        'holdTimeoutMinutes',
      ),
    );
  }

  // Тревожные, но не блокирующие кейсы: суммы лимитов по tier'ам превышают eventCapacity.
  if (capacity.eventCapacity && tickets.tiers.length > 0) {
    const totalTierLimit = tickets.tiers
      .map((t) => t.quantityLimit ?? 0)
      .reduce((acc, v) => acc + v, 0);

    if (totalTierLimit > capacity.eventCapacity && capacity.eventCapacity > 0) {
      issues.push(
        issue(
          step,
          'TIER_LIMITS_EXCEED_EVENT_CAPACITY',
          'Суммарные лимиты по типам билетов превышают общую вместимость события',
          'warning',
        ),
      );
    }
  }

  return issues;
}

// ────────────────────────────────────────────────────────────
// Publishing
// ────────────────────────────────────────────────────────────

export function validatePublishing(publishing: EventWizardPublishingDraft): EventWizardValidationIssue[] {
  const issues: EventWizardValidationIssue[] = [];
  const step: EventWizardStepKey = 'publish';

  if (publishing.status === 'published' && publishing.visibility === 'hidden') {
    issues.push(
      issue(
        step,
        'PUBLISHED_BUT_HIDDEN',
        'Событие помечено как опубликованное, но скрыто из выдачи — проверьте статус и видимость',
        'warning',
      ),
    );
  }

  return issues;
}

// ────────────────────────────────────────────────────────────
// Wizard‑level publish validation
// ────────────────────────────────────────────────────────────

export function validateWizardForPublish(draft: EventWizardDraft): EventWizardValidationIssue[] {
  const basicsIssues = validateBasics(draft.basics);
  const scheduleIssues = validateSchedule(draft.schedule);
  const ticketsIssues = validateTickets(draft.tickets);
  const capacityIssues = validateCapacity(draft.capacity, draft.tickets);
  const publishIssues = validatePublishing(draft.publishing);

  return [
    ...basicsIssues,
    ...scheduleIssues,
    ...ticketsIssues,
    ...capacityIssues,
    ...publishIssues,
  ];
}

