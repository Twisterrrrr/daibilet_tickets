import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminApi } from '../../api/client';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';

type TagCategory = 'THEME' | 'AUDIENCE' | 'SEASON' | 'SPECIAL';

interface TagItem {
  id: string;
  name: string;
  slug: string;
  category: TagCategory;
  isActive: boolean;
  _count?: { events?: number };
}

const CATEGORY_VARIANTS: Record<TagCategory, 'success' | 'warning' | 'info' | 'default'> = {
  THEME: 'info',
  AUDIENCE: 'success',
  SEASON: 'warning',
  SPECIAL: 'default',
};

const CATEGORY_LABELS: Record<TagCategory, string> = {
  THEME: 'Тема',
  AUDIENCE: 'Аудитория',
  SEASON: 'Сезон',
  SPECIAL: 'Специальный',
};

export function TagsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);

    adminApi
      .get<TagItem[] | { items: TagItem[] }>(`/admin/tags${params.toString() ? `?${params}` : ''}`)
      .then((res) => setData(Array.isArray(res) ? res : (res as any).items ?? res))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [category, search]);

  const handleRowClick = (item: TagItem) => {
    navigate(`/tags/${item.id}`);
  };

  const columns = [
    { key: 'name', label: 'Название' },
    { key: 'slug', label: 'Slug' },
    {
      key: 'category',
      label: 'Категория',
      render: (item: TagItem) => (
        <Badge variant={CATEGORY_VARIANTS[item.category] ?? 'default'}>
          {CATEGORY_LABELS[item.category] ?? item.category}
        </Badge>
      ),
    },
    {
      key: 'eventsCount',
      label: 'Событий',
      render: (item: TagItem) => item._count?.events ?? 0,
    },
    {
      key: 'isActive',
      label: 'Активен',
      render: (item: TagItem) => (
        <Badge variant={item.isActive ? 'success' : 'default'}>{item.isActive ? 'Да' : 'Нет'}</Badge>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Теги</h1>
        <Link
          to="/tags/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Создать
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Поиск по названию или slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Все категории</option>
          {(Object.keys(CATEGORY_LABELS) as TagCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        data={data}
        onRowClick={handleRowClick}
        loading={loading}
        emptyText="Нет тегов"
      />
    </div>
  );
}
