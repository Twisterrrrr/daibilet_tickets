export type EventWizardMode = 'create' | 'edit';

export type EventWizardStepKey =
  | 'basics'
  | 'schedule'
  | 'ticketsPricing'
  | 'capacity'
  | 'publish';

export type EventWizardValidationSeverity = 'info' | 'warning' | 'error';

export interface EventWizardValidationIssue {
  step: EventWizardStepKey;
  field?: string;
  code: string;
  message: string;
  severity: EventWizardValidationSeverity;
}

/**
 * Ролевая конфигурация визарда (admin vs supplier и т.п.).
 * Используется только во фронтенде для скрытия/блокировки шагов/полей.
 */
export interface EventWizardRoleConfig {
  role: 'admin' | 'supplier';
  canEditPricing: boolean;
  canEditCapacity: boolean;
  canPublish: boolean;
}

// ────────────────────────────────────────────────────────────
// Draft slices
// ────────────────────────────────────────────────────────────

/** Элемент списка локаций города (GET /admin/locations). */
export interface EventWizardLocationOption {
  id: string;
  title: string;
  shortTitle?: string | null;
  type: string;
  address?: string | null;
}

export interface EventWizardBasicsDraft {
  title: string;
  slug: string;
  category: string;
  cityId: string;
  venueId: string | null;
  supplierId: string | null;
  shortDescription: string;
  fullDescription: string;
  coverImageUrl: string;
  gallery: string[];
  /**
   * Для категории EXCURSION: после выбора города — точка старта из справочника или заявка новой.
   */
  locationChoice: 'existing' | 'propose';
  startLocationId: string;
  locationProposalTitle: string;
  locationProposalAddress: string;
  /** Значение Prisma LocationType или пусто (на бэке по умолчанию OTHER). */
  locationProposalType: string;
}

export type EventWizardScheduleMode = 'single' | 'recurring' | 'manual-multiple';

export type EventWizardRecurrenceFrequency = 'daily' | 'weekly';

export interface EventWizardRecurrenceRule {
  frequency: EventWizardRecurrenceFrequency;
  interval: number;
  /**
   * Дни недели 0–6 (вс–сб) или 1–7 (пн–вс) — валидация будет сверху.
   */
  byWeekday: number[];
  until: string | null;
  count: number | null;
}

export interface EventWizardScheduleExceptions {
  removedStartsAt: string[];
  movedStartsAt: Array<{
    from: string;
    to: string;
  }>;
}

export interface EventWizardSalesPolicy {
  stopSalesBeforeMinutes: number | null;
  salesStartAt: string | null;
  salesEndAt: string | null;
}

export interface EventWizardScheduleDraft {
  mode: EventWizardScheduleMode;
  timezone: string;
  /**
   * Лёгкий список ISO‑дат начала события (слоты).
   * Не содержит capacity / soldCount и т.п.
   */
  startsAtList: string[];
  recurrenceRule: EventWizardRecurrenceRule | null;
  exceptions: EventWizardScheduleExceptions;
  salesPolicy: EventWizardSalesPolicy;
}

export type EventWizardPricingMode = 'fixed' | 'tiered' | 'dynamic';
export type EventWizardServiceFeeMode = 'included' | 'added';

export interface EventWizardTicketTierDraft {
  id: string;
  name: string;
  description: string;
  /**
   * Цена в минимальных единицах валюты (kopecks, cents и т.п.).
   */
  priceMinor: number;
  currency: string;
  /**
   * Лимит по количеству на весь event (не per slot).
   * null = не ограничено.
   */
  quantityLimit: number | null;
  /**
   * Поля, близкие к текущей модели offers.
   */
  purchaseType: string;
  deeplink: string | null;
  commissionPercent: number | null;
  availabilityMode: string | null;
  badge: string | null;
  isPrimary: boolean;
}

export interface EventWizardTicketsDraft {
  tiers: EventWizardTicketTierDraft[];
  pricingMode: EventWizardPricingMode;
  serviceFeeMode: EventWizardServiceFeeMode;
  currency: string;
}

export interface EventWizardCapacityDraft {
  /**
   * Желаемая общая вместимость события (high‑level intent).
   * Реальное хранение по сессиям остаётся за адаптером.
   */
  eventCapacity: number | null;
  perSessionCapacityEnabled: boolean;
  oversellAllowed: boolean;
  holdTimeoutMinutes: number | null;
}

export type EventWizardPublishStatus = 'draft' | 'ready' | 'published';
export type EventWizardVisibility = 'hidden' | 'listed';

export interface EventWizardPublishingDraft {
  status: EventWizardPublishStatus;
  visibility: EventWizardVisibility;
  moderationNotes: string;
}

export type EventWizardSourceType = 'native' | 'imported';

export interface EventWizardSourceMetaDraft {
  sourceType: EventWizardSourceType;
  externalId?: string | null;
  /**
   * Список "заблокированных" для редактирования полей для импортированных событий.
   */
  lockedFields: string[];
}

// ────────────────────────────────────────────────────────────
// Основной draft
// ────────────────────────────────────────────────────────────

export interface EventWizardDraft {
  mode: EventWizardMode;
  eventId: string | null;

  basics: EventWizardBasicsDraft;
  schedule: EventWizardScheduleDraft;
  tickets: EventWizardTicketsDraft;
  capacity: EventWizardCapacityDraft;
  publishing: EventWizardPublishingDraft;
  sourceMeta: EventWizardSourceMetaDraft;
}

