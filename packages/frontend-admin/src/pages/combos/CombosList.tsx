import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminApi } from '../../api/client';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';

type Intensity = 'RELAXED' | 'NORMAL' | 'ACTIVE';

interface ComboItem {
  id: string;
  title: string;
  slug: string;
  intensity: Intensity;
  dayCount: number;
  isActive: boolean;
  sortOrder: number;
  city?: { name: string; slug: string };
}

interface CityItem {
  id: string;
  name: string;
  slug: string;
}

const INTENSITY_LABELS: Record<Intensity, string> = {
  RELAXED: 'Спокойный',
  NORMAL: 'Обычный',
  ACTIVE: 'Активный',
};

export function CombosListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ComboItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (cityFilter) params.set('city', cityFilter);

    adminApi
      .get<ComboItem[]>(`/admin/combos${params.toString() ? `?${params}` : ''}`)
      .then((res) => setData(Array.isArray(res) ? res : []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [cityFilter]);

  useEffect(() => {
    adminApi
      .get<CityItem[] | { items: CityItem[] }>('/admin/cities')
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as any).items ?? [];
        setCities(list);
      })
      .catch(() => {});
  }, []);

  const handleRowClick = (item: ComboItem) => {
    navigate(`/combos/${item.id}`);
  };

  const columns = [
    { key: 'title', label: 'Название' },
    {
      key: 'city.name',
      label: 'Город',
      render: (item: ComboItem) => item.city?.name ?? '—',
    },
    {
      key: 'intensity',
      label: 'Интенсивность',
      render: (item: ComboItem) =>
        INTENSITY_LABELS[item.intensity] ?? item.intensity,
    },
    { key: 'dayCount', label: 'Дней' },
    {
      key: 'isActive',
      label: 'Активен',
      render: (item: ComboItem) => (
        <Badge variant={item.isActive ? 'success' : 'default'}>
          {item.isActive ? 'Да' : 'Нет'}
        </Badge>
      ),
    },
    { key: 'sortOrder', label: 'Порядок' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Combo</h1>
        <Link
          to="/combos/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Создать
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-4">
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
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
        emptyText="Нет combo"
      />
    </div>
  );
}
