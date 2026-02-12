import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminApi } from '../../api/client';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';

interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  updatedAt: string;
  city?: { slug: string; name: string };
  _count?: { articleEvents: number; articleTags: number };
}

interface ArticlesResponse {
  items: ArticleItem[];
  total: number;
  page: number;
  pages: number;
}

export function ArticlesListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ArticlesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    city: '',
    published: '',
    search: '',
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.city) params.set('city', filters.city);
    if (filters.published) params.set('published', filters.published);
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page));
    params.set('limit', String(filters.limit));

    adminApi
      .get<ArticlesResponse>(`/admin/articles?${params.toString()}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [filters]);

  const handleRowClick = (item: ArticleItem) => {
    navigate(`/articles/${item.id}`);
  };

  const columns = [
    { key: 'title', label: 'Название' },
    {
      key: 'city.name',
      label: 'Город',
      render: (item: ArticleItem) => item.city?.name ?? '—',
    },
    {
      key: 'isPublished',
      label: 'Опубликован',
      render: (item: ArticleItem) => (
        <Badge variant={item.isPublished ? 'success' : 'default'}>
          {item.isPublished ? 'Да' : 'Нет'}
        </Badge>
      ),
    },
    {
      key: 'eventsCount',
      label: 'События',
      render: (item: ArticleItem) => item._count?.articleEvents ?? 0,
    },
    {
      key: 'tagsCount',
      label: 'Теги',
      render: (item: ArticleItem) => item._count?.articleTags ?? 0,
    },
    {
      key: 'updatedAt',
      label: 'Обновлено',
      render: (item: ArticleItem) =>
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Статьи</h1>
        <Link
          to="/articles/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Создать
        </Link>
      </div>

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
          value={filters.published}
          onChange={(e) => setFilters((f) => ({ ...f, published: e.target.value, page: 1 }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Все</option>
          <option value="true">Опубликованные</option>
          <option value="false">Черновики</option>
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
        emptyText="Нет статей"
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
