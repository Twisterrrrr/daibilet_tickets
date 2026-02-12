import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi } from '../../api/client';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';

type EventCategory = 'EXCURSION' | 'MUSEUM' | 'EVENT';

interface Session {
  id: string;
  startsAt: string;
  availableTickets: number;
  prices?: { min?: number; max?: number } | number[];
}

interface Tag {
  id: string;
  name: string;
}

interface EventDetail {
  id: string;
  title: string;
  category: EventCategory;
  isActive: boolean;
  imageUrl: string | null;
  rating: number | null;
  address: string | null;
  description: string | null;
  shortDescription: string | null;
  minAge: number | null;
  sessions?: Session[];
  tags?: Tag[];
}

export function EventEditPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<EventDetail>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    adminApi
      .get<EventDetail>(`/admin/events/${id}`)
      .then((data) => {
        setEvent(data);
        setForm({
          title: data.title,
          category: data.category,
          isActive: data.isActive,
          imageUrl: data.imageUrl ?? '',
          rating: data.rating,
          address: data.address ?? '',
          description: data.description ?? '',
          shortDescription: data.shortDescription ?? '',
          minAge: data.minAge,
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    adminApi
      .put(`/admin/events/${id}`, form)
      .then(() => {
        setEvent((prev) => (prev ? { ...prev, ...form } : null));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка сохранения'))
      .finally(() => setSaving(false));
  };

  const sessionColumns = [
    {
      key: 'startsAt',
      label: 'Дата/время',
      render: (s: Session) =>
        s.startsAt
          ? new Date(s.startsAt).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—',
    },
    { key: 'availableTickets', label: 'Доступно билетов' },
    {
      key: 'prices',
      label: 'Цены',
      render: (s: Session) => {
        const p = s.prices;
        if (!p) return '—';
        if (Array.isArray(p)) return p.join(', ');
        if (typeof p === 'object' && p.min != null) return `${p.min}–${p.max ?? p.min}`;
        return String(p);
      },
    },
  ];

  if (loading) return <div className="text-gray-400">Загрузка...</div>;
  if (!event) return <div className="text-red-500">{error || 'Событие не найдено'}</div>;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/events"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Назад
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Редактировать событие</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Основные данные</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Название</label>
              <input
                type="text"
                value={form.title ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Категория</label>
              <select
                value={form.category ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as EventCategory }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="EXCURSION">EXCURSION</option>
                <option value="MUSEUM">MUSEUM</option>
                <option value="EVENT">EVENT</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive ?? false}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Активен
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">URL изображения</label>
              <input
                type="text"
                value={form.imageUrl ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Рейтинг</label>
              <input
                type="number"
                step="0.1"
                value={form.rating ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rating: e.target.value ? Number(e.target.value) : null }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Мин. возраст</label>
              <input
                type="number"
                value={form.minAge ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minAge: e.target.value ? Number(e.target.value) : null }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Адрес</label>
              <input
                type="text"
                value={form.address ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Краткое описание</label>
              <textarea
                rows={2}
                value={form.shortDescription ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Описание</label>
              <textarea
                rows={4}
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>

        {event.sessions && event.sessions.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Сессии</h2>
            <DataTable
              columns={sessionColumns}
              data={event.sessions}
              emptyText="Нет сессий"
            />
          </div>
        )}

        {event.tags && event.tags.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Теги</h2>
            <div className="flex flex-wrap gap-2">
              {event.tags.map((t) => (
                <Badge key={t.id} variant="info">
                  {t.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
