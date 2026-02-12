import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/client';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';

type EventCategory = 'EXCURSION' | 'MUSEUM' | 'EVENT';
type EventSource = 'TC' | 'TEPLOHOD';

interface EventItem {
  id: string;
  title: string;
  category: EventCategory;
  source: EventSource;
  rating: number | null;
  isActive: boolean;
  updatedAt: string;
  city?: { name: string };
  _count?: { sessions?: number };
}

interface EventsResponse {
  items: EventItem[];
  total: number;
  page: number;
  pages: number;
}

export function EventsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    city: '',
    category: '',
    source: '',
    active: '',
    search: '',
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.city) params.set('city', filters.city);
    if (filters.category) params.set('category', filters.category);
    if (filters.source) params.set('source', filters.source);
    if (filters.active) params.set('active', filters.active);
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page));
    params.set('limit', String(filters.limit));

    adminApi
      .get<EventsResponse>(`/admin/events?${params.toString()}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [filters]);

  const handleRowClick = (item: EventItem) => {
    navigate(`/events/${item.id}`);
  };

  const columns = [
    { key: 'title', label: 'Название' },
    {
      key: 'city.name',
      label: 'Город',
      render: (item: EventItem) => item.city?.name ?? '—',
    },
    { key: 'category', label: 'Категория' },
    { key: 'source', label: 'Источник' },
    {
      key: 'rating',
      label: 'Рейтинг',
      render: (item: EventItem) => (item.rating != null ? String(item.rating) : '—'),
    },
    {
      key: 'isActive',
      label: 'Активен',
      render: (item: EventItem) => (
        <Badge variant={item.isActive ? 'success' : 'default'}>
          {item.isActive ? 'Да' : 'Нет'}
        </Badge>
      ),
    },
    {
      key: 'sessionsCount',
      label: 'Сессий',
      render: (item: EventItem) => item._count?.sessions ?? 0,
    },
    {
      key: 'updatedAt',
      label: 'Обновлено',
      render: (item: EventItem) =>
        item.updatedAt
          ? new Date(item.updatedAt).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : '—',
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">События</h1>

      <div className="mb-4 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Поиск..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <select
          value={filters.city}
          onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Все города</option>
          <option value="moscow">Москва</option>
          <option value="spb">Санкт-Петербург</option>
          <option value="kazan">Казань</option>
          <option value="kaliningrad">Калининград</option>
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Все категории</option>
          <option value="EXCURSION">EXCURSION</option>
          <option value="MUSEUM">MUSEUM</option>
          <option value="EVENT">EVENT</option>
        </select>
        <select
          value={filters.source}
          onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Все источники</option>
          <option value="TC">TC</option>
          <option value="TEPLOHOD">TEPLOHOD</option>
        </select>
        <select
          value={filters.active}
          onChange={(e) => setFilters((f) => ({ ...f, active: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Все</option>
          <option value="true">Активные</option>
          <option value="false">Неактивные</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        onRowClick={handleRowClick}
        loading={loading}
        emptyText="Нет событий"
      />

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Показано {data.items.length} из {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              disabled={filters.page <= 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Назад
            </button>
            <span className="flex items-center px-2 text-sm text-gray-600">
              {filters.page} / {data.pages}
            </span>
            <button
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              disabled={filters.page >= data.pages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
