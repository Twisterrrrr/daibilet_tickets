/**
 * Widget Payload Validation — zod-схемы для каждого провайдера.
 *
 * purchaseType=WIDGET → рендерим виджет по widgetProvider.
 * widgetPayload — типизированный JSON, валидируемый по provider.
 *
 * Версионирование: поле `v` внутри payload.
 * При изменении формата — добавляем v: 2 и обратную совместимость.
 */

import { z } from 'zod';

// ========================================
// Payload Version
// ========================================

export const CURRENT_PAYLOAD_VERSION = 1;

// ========================================
// Provider-specific Schemas
// ========================================

/** TicketsCloud widget payload */
export const TCWidgetPayloadSchema = z.object({
  v: z.number().default(CURRENT_PAYLOAD_VERSION),
  externalEventId: z.string().min(1, 'externalEventId обязателен для TC'),
  metaEventId: z.string().optional(),
  tokenKey: z.string().optional(),
});
export type TCWidgetPayload = z.infer<typeof TCWidgetPayloadSchema>;

/** Radario widget payload */
export const RadarioWidgetPayloadSchema = z.object({
  v: z.number().default(CURRENT_PAYLOAD_VERSION),
  externalEventId: z.string().min(1, 'externalEventId обязателен для Radario'),
  apiKey: z.string().optional(),
  widgetId: z.string().optional(),
});
export type RadarioWidgetPayload = z.infer<typeof RadarioWidgetPayloadSchema>;

/** TimePad widget payload */
export const TimepadWidgetPayloadSchema = z.object({
  v: z.number().default(CURRENT_PAYLOAD_VERSION),
  externalEventId: z.string().min(1, 'externalEventId обязателен для TimePad'),
  embedUrl: z.string().url().optional(),
});
export type TimepadWidgetPayload = z.infer<typeof TimepadWidgetPayloadSchema>;

/**
 * TEPLOHOD widget payload.
 * tepWidgetId — ID виджета из админки teplohod.info (для data-id в embed).
 * tepEventId — fallback: ID события из API (tep.id).
 */
export const TepWidgetPayloadSchema = z.object({
  v: z.number().default(CURRENT_PAYLOAD_VERSION),
  tepWidgetId: z.union([z.string(), z.number()]).optional(),
  tepEventId: z.union([z.string(), z.number()]).optional(),
});
export type TepWidgetPayload = z.infer<typeof TepWidgetPayloadSchema>;

/** Generic / unknown widget payload (fallback) */
export const GenericWidgetPayloadSchema = z.object({
  v: z.number().default(CURRENT_PAYLOAD_VERSION),
  externalEventId: z.string().optional(),
  metaEventId: z.string().optional(),
  tokenKey: z.string().optional(),
});
export type GenericWidgetPayload = z.infer<typeof GenericWidgetPayloadSchema>;

// ========================================
// Provider → Schema registry
// ========================================

const PAYLOAD_SCHEMAS: Record<string, z.ZodType> = {
  TC: TCWidgetPayloadSchema,
  RADARIO: RadarioWidgetPayloadSchema,
  TIMEPAD: TimepadWidgetPayloadSchema,
  TEPLOHOD: TepWidgetPayloadSchema,
};

// ========================================
// Validation
// ========================================

export interface WidgetPayloadValidationResult {
  valid: boolean;
  data?: Record<string, unknown>;
  errors?: string[];
}

/**
 * Валидировать widgetPayload по provider.
 *
 * @param provider — widgetProvider (TC, RADARIO, TIMEPAD, ...)
 * @param payload — сырой JSON из БД или формы
 * @returns { valid, data?, errors? }
 */
export function validateWidgetPayload(
  provider: string | null | undefined,
  payload: unknown,
): WidgetPayloadValidationResult {
  if (!provider) {
    return { valid: false, errors: ['widgetProvider не указан'] };
  }

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['widgetPayload пуст или не является объектом'] };
  }

  const schema = PAYLOAD_SCHEMAS[provider] || GenericWidgetPayloadSchema;

  const result = schema.safeParse(payload);
  if (result.success) {
    return { valid: true, data: result.data as Record<string, unknown> };
  }

  // Zod v4 compatible error extraction
  const errors = (result as any).error?.issues?.map?.((i: any) => `${i.path?.join?.('.') || ''}: ${i.message}`) || [
    'Невалидный widgetPayload',
  ];

  return { valid: false, errors };
}

/**
 * Добавить версию в payload (если отсутствует).
 */
export function ensurePayloadVersion(payload: Record<string, unknown>): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !('v' in payload)) {
    return { v: CURRENT_PAYLOAD_VERSION, ...payload };
  }
  return payload;
}
