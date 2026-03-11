/**
 * Режимы наследования правил возврата/обмена.
 * @see docs/PageTemplateSpecs.md
 */

export enum VenueRefundPolicyMode {
  INHERIT_SUPPLIER = 'INHERIT_SUPPLIER',
  CUSTOM = 'CUSTOM',
}

export enum EventRefundPolicyMode {
  INHERIT_SUPPLIER = 'INHERIT_SUPPLIER',
  INHERIT_VENUE = 'INHERIT_VENUE',
  CUSTOM = 'CUSTOM',
}

export const DEFAULT_REFUND_POLICY_TEXT =
  'Условия возврата и обмена билетов зависят от правил конкретного организатора. ' +
  'Подробности уточняйте при покупке или обращайтесь в службу поддержки.';
