import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard } from '@daibilet/shared-ui';

import { api } from '../lib/api';

interface SessionRow {
  id: string;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  soldTickets: number;
}

interface EventOption {
  id: string;
  title: string;
  source?: string;
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AvailabilityPage() {
  const [searchParams] = useSearchParams();
  const eventIdFromUrl = searchParams.get('eventId') ?? '';

  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [newCapacityInput, setNewCapacityInput] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ updatedIds: string[]; failed: { sessionId: string; soldQty: number }[] } | null>(null);

  const loadEvents = useCallback(() => {
    setLoadingEvents(true);
    api
      .get<{ items: EventOption[] }>('/supplier/events')
      .then((res) => {
        const items = res.items ?? [];
        setEvents(items);
        if (items.length === 0) return;
        if (eventIdFromUrl && items.some((e: EventOption) => e.id === eventIdFromUrl)) {
          setSelectedEventId(eventIdFromUrl);
        } else if (!selectedEventId) {
          const first = items.find((e: EventOption) => e.source === 'MANUAL') ?? items[0];
          if (first) setSelectedEventId(first.id);
        }
      })
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));
  }, [eventIdFromUrl, selectedEventId]);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load once on mount
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setSessions([]);
      setSelectedIds(new Set());
      return;
    }
    setLoadingSessions(true);
    setError(null);
    api
      .get<SessionRow[]>(`/supplier/events/${selectedEventId}/sessions`)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setSessions(list);
        setSelectedIds(new Set());
      })
      .catch((e) => {
        setSessions([]);
        setError(e instanceof Error ? e.message : 'Ошибка загрузки сессий');
      })
      .finally(() => setLoadingSessions(false));
  }, [selectedEventId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sessions.map((s) => s.id)));
    }
  };

  const openBulkModal = () => {
    setBulkResult(null);
    setNewCapacityInput('');
    setModalOpen(true);
  };

  const submitBulkCapacity = async () => {
    const num = Number(newCapacityInput);
    if (!Number.isInteger(num) || num < 0) {
      setError('Введите неотрицательное целое число.');
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkSubmitting(true);
    setError(null);
    try {
      const res = await api.patch<{ updatedIds: string[]; failed: { sessionId: string; soldQty: number }[] }>(
        `/supplier/events/${selectedEventId}/sessions/bulk-capacity`,
        { sessionIds: ids, newCapacity: num },
      );
      setBulkResult(res);
      if (res.updatedIds.length > 0) {
        const list = await api.get<SessionRow[]>(`/supplier/events/${selectedEventId}/sessions`);
        setSessions(Array.isArray(list) ? list : []);
        setSelectedIds(new Set());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка изменения вместимости');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Наличие и вместимость"
        subtitle="Массовое изменение вместимости по сеансам события"
      />

      {error && (
        <ErrorState
          title="Ошибка"
          description={error}
          action={
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setError(null)}
            >
              Скрыть
            </button>
          }
        />
      )}

      <SectionCard title="Событие">
        {loadingEvents ? (
          <LoadingState label="Загрузка событий..." />
        ) : (
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          >
            <option value="">Выберите событие</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title || e.id}
                {e.source === 'MANUAL' ? ' (ручное)' : ''}
              </option>
            ))}
          </select>
        )}
      </SectionCard>

      {selectedEventId && (
        <SectionCard
          title="Сеансы"
          action={
            hasSelection && (
              <button
                type="button"
                onClick={openBulkModal}
                className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
              >
                Изменить вместимость ({selectedCount})
              </button>
            )
          }
        >
          {loadingSessions ? (
            <LoadingState label="Загрузка сеансов..." />
          ) : sessions.length === 0 ? (
            <EmptyState
              title="Нет будущих сеансов"
              description="Добавьте расписание в карточке события или выберите другое событие."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500">
                    <th className="px-2 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === sessions.length && sessions.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="px-2 py-2 text-left">Дата и время</th>
                    <th className="px-2 py-2 text-left">Вместимость</th>
                    <th className="px-2 py-2 text-left">Продано</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-2 py-2 text-slate-800">{formatSessionDate(s.startsAt)}</td>
                      <td className="px-2 py-2 text-slate-600">{s.capacity ?? '—'}</td>
                      <td className="px-2 py-2 text-slate-600">{s.soldTickets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-5 shadow-lg">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Изменить вместимость</h3>
            <p className="mb-3 text-xs text-slate-600">
              Выбрано сеансов: {selectedCount}. Новая вместимость не может быть меньше уже проданных билетов.
            </p>
            <input
              type="number"
              min={0}
              step={1}
              value={newCapacityInput}
              onChange={(e) => setNewCapacityInput(e.target.value)}
              placeholder="Вместимость"
              className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            {bulkResult && (
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <p>Обновлено: {bulkResult.updatedIds.length}</p>
                {bulkResult.failed.length > 0 && (
                  <p className="mt-1 text-amber-700">
                    Не обновлено (продано больше): {bulkResult.failed.map((f) => `продано ${f.soldQty}`).join(', ')}
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setBulkResult(null);
                }}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Закрыть
              </button>
              <button
                type="button"
                disabled={bulkSubmitting}
                onClick={submitBulkCapacity}
                className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {bulkSubmitting ? 'Сохранение…' : 'Применить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
