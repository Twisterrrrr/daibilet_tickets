import { ApiError } from '@/shared/api/client';

export type RequestErrorKind = 'access_denied' | 'unauthorized' | 'retryable' | 'unknown';

export type RequestErrorPresentation = {
  kind: RequestErrorKind;
  title: string;
  message: string;
  requestId: string | null;
  status: number | null;
};

export function presentRequestError(err: unknown): RequestErrorPresentation {
  if (err instanceof ApiError) {
    const requestId = err.requestId ?? null;
    const status = typeof err.status === 'number' ? err.status : null;

    if (status === 401) {
      return {
        kind: 'unauthorized',
        title: 'Сессия истекла',
        message: err.message || 'Требуется повторный вход.',
        requestId,
        status,
      };
    }

    if (status === 403) {
      return {
        kind: 'access_denied',
        title: 'Доступ запрещён',
        message: err.message || 'Недостаточно прав для просмотра этого раздела.',
        requestId,
        status,
      };
    }

    if (status === 0 || (status != null && status >= 500)) {
      return {
        kind: 'retryable',
        title: 'Временная ошибка',
        message: err.message || 'Сервис временно недоступен. Попробуйте ещё раз.',
        requestId,
        status,
      };
    }

    return {
      kind: 'unknown',
      title: 'Ошибка запроса',
      message: err.message || 'Не удалось выполнить запрос.',
      requestId,
      status,
    };
  }

  const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
  return {
    kind: 'unknown',
    title: 'Ошибка',
    message: msg,
    requestId: null,
    status: null,
  };
}

