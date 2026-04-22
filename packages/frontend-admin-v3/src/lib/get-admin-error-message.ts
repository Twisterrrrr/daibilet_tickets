import { AdminApiError } from '@/api/client';
import { adminErrorCodes } from '@/lib/admin-error-codes';

export type AdminErrorDisplay = {
  /** Заголовок для UI (из каталога или message). */
  title: string;
  /** Доп. текст из каталога. */
  description?: string;
  /** Исходный message с сервера (для отладки / деталей). */
  rawMessage: string;
  /** Код, если был. */
  code?: string;
};

const DEFAULT_FALLBACK = 'Произошла ошибка';

/**
 * Единая точка разбора ошибок API для диалогов, toast и форм.
 */
export function getAdminErrorDisplay(error: unknown, fallbackMessage = DEFAULT_FALLBACK): AdminErrorDisplay {
  const rawMessage =
    error instanceof Error ? error.message : error === null || error === undefined ? '' : String(error);

  if (error instanceof AdminApiError && error.code && adminErrorCodes[error.code]) {
    const meta = adminErrorCodes[error.code];
    return {
      title: meta.title,
      description: meta.description,
      rawMessage: rawMessage || meta.title,
      code: error.code,
    };
  }

  if (error instanceof AdminApiError && error.code) {
    return {
      title: rawMessage || fallbackMessage,
      rawMessage: rawMessage || fallbackMessage,
      code: error.code,
    };
  }

  return {
    title: rawMessage.trim() ? rawMessage : fallbackMessage,
    rawMessage: rawMessage.trim() ? rawMessage : fallbackMessage,
  };
}

/** Короткая строка для однострочного показа (legacy-совместимость). */
export function getAdminErrorMessage(error: unknown, fallbackMessage = DEFAULT_FALLBACK): string {
  return getAdminErrorDisplay(error, fallbackMessage).title;
}

/** Подпись для элемента batch-результата (код из каталога или message). */
export function getBatchResultItemLabel(code: string | undefined, message: string | undefined): string {
  if (code && adminErrorCodes[code]) {
    const m = adminErrorCodes[code];
    return m.description ? `${m.title} — ${m.description}` : m.title;
  }
  return (message ?? '').trim() || 'Ошибка';
}
