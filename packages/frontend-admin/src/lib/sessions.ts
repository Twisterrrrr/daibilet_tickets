export type LockReason = 'SOLD' | 'PAST' | 'IMPORTED' | 'OTHER';

export function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function formatDateRu(iso: string) {
  const d = new Date(iso);
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export function formatTimeRu(iso: string) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function isoToDateInput(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export function isoToTimeInput(iso: string) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function buildIsoFromInputs(date: string, time: string) {
  const d = new Date(`${date}T${time}:00`);
  return d.toISOString();
}

export function getSessionLockedMessage(err: unknown) {
  const anyErr = err as any;
  const data = anyErr?.response?.data ?? anyErr?.data;

  if (data?.code === 'SESSION_LOCKED') {
    switch (data.reason as LockReason) {
      case 'IMPORTED':
        return 'Импортное событие: изменения расписания запрещены.';
      case 'SOLD':
        return 'Есть продажи: нельзя изменить/удалить/остановить сеанс.';
      case 'PAST':
        return 'Сеанс уже прошёл: нельзя изменить/удалить/остановить.';
      case 'OTHER':
      default:
        return data.message ?? 'Сеанс заблокирован.';
    }
  }

  return anyErr?.message ?? 'Ошибка операции.';
}

