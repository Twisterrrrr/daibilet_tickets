import { CalendarDays } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { api } from '@/shared/lib/api';
import { PageGlyph } from '@/shared/ui/page-glyph';
import {
  EmptyState,
  ErrorPanel,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from '@/shared/ui/page-primitives';

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

export function AvailabilityPage() {
  const [searchParams] = useSearchParams();
  const eventIdFromUrl = searchParams.get('eventId') ?? '';

  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [newCapacityInput, setNewCapacityInput] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    updatedIds: string[];
    failed: { sessionId: string; soldQty: number }[];
  } | null>(null);

  const loadEvents = useCallback(() => {
    setLoadingEvents(true);
    api
      .get<{ items: EventOption[] }>('/supplier/events')
      .then((res) => {
        const items = res.items ?? [];
        setEvents(items);
        setSelectedEventId((current) => {
          if (items.length === 0) return '';
          if (
            eventIdFromUrl &&
            items.some((e: EventOption) => e.id === eventIdFromUrl)
          ) {
            return eventIdFromUrl;
          }
          if (current && items.some((e) => e.id === current)) return current;
          const first = items.find((e: EventOption) => e.source === 'MANUAL') ?? items[0];
          return first?.id ?? '';
        });
      })
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));
  }, [eventIdFromUrl]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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
      .catch((e: unknown) => {
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
    if (selectedIds.size === sessions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sessions.map((s) => s.id)));
  };

  const submitBulkCapacity = async () => {
    const num = Number(newCapacityInput);
    if (!Number.isInteger(num) || num < 0) {
      setError('Введите неотрицательное целое число.');
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !selectedEventId) return;
    setBulkSubmitting(true);
    setError(null);
    try {
      const res = await api.patch<{
        updatedIds: string[];
        failed: { sessionId: string; soldQty: number }[];
      }>(`/supplier/events/${selectedEventId}/sessions/bulk-capacity`, {
        sessionIds: ids,
        newCapacity: num,
      });
      setBulkResult(res);
      if (res.updatedIds.length > 0) {
        const list = await api.get<SessionRow[]>(`/supplier/events/${selectedEventId}/sessions`);
        setSessions(Array.isArray(list) ? list : []);
        setSelectedIds(new Set());
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка изменения вместимости');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Вместимость и квота"
        subtitle="Управление вместимостью по сеансам выбранного события"
        glyph={<PageGlyph icon={CalendarDays} tone="sky" />}
      />

      {error ? (
        <ErrorPanel
          title="Ошибка"
          description={error}
          onRetry={() => {
            setError(null);
            loadEvents();
          }}
        />
      ) : null}

      <SectionCard title="Событие">
        {loadingEvents ? (
          <LoadingBlock label="Загрузка событий…" />
        ) : (
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full max-w-md rounded-control border border-border-soft px-3 py-2 text-small outline-none focus:border-accent"
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

      {selectedEventId ? (
        <SectionCard
          title="Сеансы"
          action={
            hasSelection ? (
              <button
                type="button"
                onClick={() => {
                  setBulkResult(null);
                  setNewCapacityInput('');
                  setModalOpen(true);
                }}
                className="rounded-control bg-accent px-3 py-1.5 text-label font-medium text-accent-foreground"
              >
                Изменить вместимость ({selectedCount})
              </button>
            ) : null
          }
        >
          {loadingSessions ? (
            <LoadingBlock label="Загрузка сеансов…" />
          ) : sessions.length === 0 ? (
            <EmptyState
              title="Нет сеансов"
              description="Добавьте расписание в карточке события или выберите другое событие."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-small">
                <thead>
                  <tr className="border-b border-border-soft text-left text-label text-text-muted">
                    <th className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === sessions.length && sessions.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-border-soft"
                      />
                    </th>
                    <th className="px-2 py-2">Дата и время</th>
                    <th className="px-2 py-2">Вместимость</th>
                    <th className="px-2 py-2">Продано</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b border-border-soft last:border-0">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="rounded border-border-soft"
                        />
                      </td>
                      <td className="px-2 py-2 text-text-primary">{formatSessionDate(s.startsAt)}</td>
                      <td className="px-2 py-2 text-text-secondary">{s.capacity ?? '—'}</td>
                      <td className="px-2 py-2 text-text-secondary">{s.soldTickets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-card border border-border-soft bg-surface p-5 shadow-soft">
            <h3 className="mb-3 text-section text-text-primary">Изменить вместимость</h3>
            <p className="mb-3 text-small text-text-secondary">
              Выбрано сеансов: {selectedCount}. Новая вместимость не может быть меньше числа проданных
              билетов.
            </p>
            <input
              type="number"
              min={0}
              step={1}
              value={newCapacityInput}
              onChange={(e) => setNewCapacityInput(e.target.value)}
              placeholder="Вместимость"
              className="mb-4 w-full rounded-control border border-border-soft px-3 py-2 text-small outline-none focus:border-accent"
            />
            {bulkResult ? (
              <div className="mb-4 rounded-card border border-border-soft bg-surface-alt px-3 py-2 text-[11px] text-text-secondary">
                <p>Обновлено: {bulkResult.updatedIds.length}</p>
                {bulkResult.failed.length > 0 ? (
                  <p className="mt-1 text-warning">
                    Не обновлено: {bulkResult.failed.map((f) => `сессия, продано ${f.soldQty}`).join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setBulkResult(null);
                }}
                className="rounded-control border border-border-soft px-3 py-1.5 text-label text-text-primary hover:bg-surface-alt"
              >
                Закрыть
              </button>
              <button
                type="button"
                disabled={bulkSubmitting}
                onClick={() => void submitBulkCapacity()}
                className="rounded-control bg-accent px-3 py-1.5 text-label font-medium text-accent-foreground disabled:opacity-50"
              >
                {bulkSubmitting ? 'Сохранение…' : 'Применить'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
