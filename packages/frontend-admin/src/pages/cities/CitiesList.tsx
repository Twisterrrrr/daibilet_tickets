import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/client';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';

interface CityItem {
  id: string;
  name: string;
  slug: string;
  isFeatured: boolean;
  isActive: boolean;
  _count?: {
    events?: number;
    landings?: number;
    combos?: number;
  };
}

export function CitiesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set('search', search);

    const query = params.toString();
    const path = query ? `/admin/cities?${query}` : '/admin/cities';

    adminApi
      .get<CityItem[] | { items: CityItem[] }>(path)
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as { items: CityItem[] }).items;
        setItems(list ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [search]);

  const handleRowClick = (item: CityItem) => {
    navigate(`/cities/${item.id}`);
  };

  const columns = [
    { key: 'name', label: 'Название' },
    { key: 'slug', label: 'Slug' },
    {
      key: 'isFeatured',
      label: 'В топе',
      render: (item: CityItem) => (
        <Badge variant={item.isFeatured ? 'success' : 'default'}>
          {item.isFeatured ? 'Да' : 'Нет'}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      label: 'Активен',
      render: (item: CityItem) => (
        <Badge variant={item.isActive ? 'success' : 'default'}>
          {item.isActive ? 'Да' : 'Нет'}
        </Badge>
      ),
    },
    {
      key: 'eventsCount',
      label: 'Событий',
      render: (item: CityItem) => item._count?.events ?? 0,
    },
    {
      key: 'landingsCount',
      label: 'Лендингов',
      render: (item: CityItem) => item._count?.landings ?? 0,
    },
    {
      key: 'combosCount',
      label: 'Combo',
      render: (item: CityItem) => item._count?.combos ?? 0,
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">Города</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        data={items}
        onRowClick={handleRowClick}
        loading={loading}
        emptyText="Нет городов"
      />
    </div>
  );
}
