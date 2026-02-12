import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi } from '../../api/client';

interface CityDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  heroImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isFeatured: boolean;
  isActive: boolean;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
}

export function CityEditPage() {
  const { id } = useParams<{ id: string }>();
  const [city, setCity] = useState<CityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<CityDetail>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    adminApi
      .get<CityDetail>(`/admin/cities/${id}`)
      .then((data) => {
        setCity(data);
        setForm({
          name: data.name,
          slug: data.slug,
          description: data.description ?? '',
          heroImage: data.heroImage ?? '',
          metaTitle: data.metaTitle ?? '',
          metaDescription: data.metaDescription ?? '',
          isFeatured: data.isFeatured,
          isActive: data.isActive,
          lat: data.lat,
          lng: data.lng,
          timezone: data.timezone ?? '',
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
      .put(`/admin/cities/${id}`, form)
      .then(() => {
        setCity((prev) => (prev ? { ...prev, ...form } : null));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка сохранения'))
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="text-gray-400">Загрузка...</div>;
  if (!city) return <div className="text-red-500">{error || 'Город не найден'}</div>;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/cities"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Назад
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Редактировать город</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Название</label>
            <input
              type="text"
              value={form.name ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Slug</label>
            <input
              type="text"
              value={form.slug ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isFeatured"
              checked={form.isFeatured ?? false}
              onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isFeatured" className="text-sm text-gray-700">
              В топе
            </label>
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
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Описание</label>
            <textarea
              rows={3}
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Hero изображение (URL)</label>
            <input
              type="text"
              value={form.heroImage ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, heroImage: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Meta title</label>
            <input
              type="text"
              value={form.metaTitle ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-500">Meta description</label>
            <textarea
              rows={2}
              value={form.metaDescription ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Широта (lat)</label>
            <input
              type="number"
              step="any"
              value={form.lat ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, lat: e.target.value ? Number(e.target.value) : null }))
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Долгота (lng)</label>
            <input
              type="number"
              step="any"
              value={form.lng ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, lng: e.target.value ? Number(e.target.value) : null }))
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Часовой пояс</label>
            <input
              type="text"
              placeholder="Europe/Moscow"
              value={form.timezone ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
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
    </div>
  );
}
