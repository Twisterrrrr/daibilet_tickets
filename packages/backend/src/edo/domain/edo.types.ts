import type { EdoProviderType, EdoDeliveryStatus } from '@/prisma-client';

/** Провайдер-специфичный профиль для sendDocument. */
export interface EdoProviderProfile {
  provider: EdoProviderType;
  boxId: string | null;
  inn: string;
  kpp: string | null;
  settingsJson: Record<string, unknown> | null;
}

/** Снапшот юр. профиля из документа/отчёта (для будущего XML). */
export interface EdoLegalProfileSnapshot {
  legalName?: string | null;
  inn?: string | null;
  kpp?: string | null;
  legalAddress?: string | null;
  taxMode?: string | null;
}

/** Параметры для отправки документа в ЭДО. */
export interface EdoSendParams {
  deliveryId: string;
  documentId: string;
  operatorId: string;
  reportId: string | null;
  documentType: string;
  providerProfile: EdoProviderProfile;
  supplierDocument: {
    id: string;
    title: string;
    payloadJson: unknown;
  };
  legalProfileSnapshot: EdoLegalProfileSnapshot | null;
  files?: Array<{
    kind: string;
    storageKey: string;
    fileName: string | null;
    mimeType: string | null;
  }>;
}

/** Результат отправки документа. */
export interface EdoSendResult {
  providerDeliveryId: string;
  status: EdoDeliveryStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  meta?: Record<string, unknown>;
}

/** Результат запроса статуса доставки. */
export interface EdoDeliveryStatusResult {
  status: EdoDeliveryStatus;
  deliveredAt?: Date | null;
  signedAt?: Date | null;
  rejectedAt?: Date | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  meta?: Record<string, unknown>;
}
