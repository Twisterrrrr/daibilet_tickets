import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';

import { adminApi } from '../../api/client';

type Intensity = 'RELAXED' | 'NORMAL' | 'ACTIVE';

interface CityItem {
  id: string;
  name: string;
  slug: string;
}

interface ComboForm {
  slug: string;
  cityId: string;
  title: string;
  subtitle: string;
  description: string;
  heroImage: string;
  intensity: Intensity;
  dayCount: number;
  suggestedPriceRub: number | '';
  metaTitle: string;
  metaDescription: string;
  isActive: boolean;
  sortOrder: number;
  curatedEvents: string;
  features: string;
  includes: string;
  faq: string;
}

const INTENSITY_OPTIONS: { value: Intensity; label: string }[] = [
  { value: 'RELAXED', label: 'Спокойный' },
  { value: 'NORMAL', label: 'Обычный' },
  { value: 'ACTIVE', label: 'Активный' },
];

const EMPTY_FORM: ComboForm = {
  slug: '',
  cityId: '',
  title: '',
  subtitle: '',
  description: '',
  heroImage: '',
  intensity: 'NORMAL',
  dayCount: 1,
  suggestedPriceRub: '',
  metaTitle: '',
  metaDescription: '',
  isActive: true,
  sortOrder: 0,
  curatedEvents: '[]',
  features: '[]',
  includes: '[]',
  faq: '[]',
};

function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    if (!str.trim()) return fallback;
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

export function ComboEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCreate = !id || id === 'new';

  const [form, setForm] = useState<ComboForm>(EMPTY_FORM);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .get<CityItem[] | { items: CityItem[] }>('/admin/cities')
      .then((res) => {
        const list = Array.isArray(res) ? res : ((res as any).items ?? []);
        setCities(list);
      })
      .catch((e) => console.error('Load cities failed:', e));
  }, []);

  useEffect(() => {
    if (isCreate) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    adminApi
      .get<any>(`/admin/combos/${id}`)
      .then((data) => {
        setForm({
          slug: data.slug ?? '',
          cityId: data.cityId ?? '',
          title: data.title ?? '',
          subtitle: data.subtitle ?? '',
          description: data.description ?? '',
          heroImage: data.heroImage ?? '',
          intensity: data.intensity ?? 'NORMAL',
          dayCount: data.dayCount ?? 1,
          suggestedPriceRub: data.suggestedPrice != null ? Math.round(data.suggestedPrice / 100) : '',
          metaTitle: data.metaTitle ?? '',
          metaDescription: data.metaDescription ?? '',
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder ?? 0,
          curatedEvents: JSON.stringify(data.curatedEvents ?? [], null, 2),
          features: JSON.stringify(data.features ?? [], null, 2),
          includes: JSON.stringify(data.includes ?? [], null, 2),
          faq: JSON.stringify(data.faq ?? [], null, 2),
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id, isCreate]);

  const buildPayload = () => {
    const suggestedPrice = form.suggestedPriceRub !== '' ? Math.round(Number(form.suggestedPriceRub) * 100) : null;
    return {
      slug: form.slug,
      cityId: form.cityId,
      title: form.title,
      subtitle: form.subtitle || null,
      description: form.description || null,
      heroImage: form.heroImage || null,
      intensity: form.intensity,
      dayCount: form.dayCount,
      suggestedPrice,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
      curatedEvents: safeJsonParse(form.curatedEvents, []),
      features: safeJsonParse(form.features, []),
      includes: safeJsonParse(form.includes, []),
      faq: safeJsonParse(form.faq, []),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isCreate) {
        await adminApi.post('/admin/combos', buildPayload());
        navigate('/combos');
      } else {
        await adminApi.put(`/admin/combos/${id}`, buildPayload());
        navigate('/combos');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка сохранения');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isCreate && !window.confirm('Удалить этот combo?')) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.delete(`/admin/combos/${id}`);
      navigate('/combos');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка удаления');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">{isCreate ? 'Новый combo' : 'Редактирование combo'}</h1>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Slug</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Город</label>
          <select
            value={form.cityId}
            onChange={(e) => setForm((f) => ({ ...f, cityId: e.target.value }))}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Выберите город</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Заголовок</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Подзаголовок</label>
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Описание (SEO)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Hero Image (URL)</label>
          <input
            type="text"
            value={form.heroImage}
            onChange={(e) => setForm((f) => ({ ...f, heroImage: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Интенсивность</label>
          <select
            value={form.intensity}
            onChange={(e) => setForm((f) => ({ ...f, intensity: e.target.value as Intensity }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {INTENSITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Дней (dayCount)</label>
          <input
            type="number"
            min={1}
            value={form.dayCount}
            onChange={(e) => setForm((f) => ({ ...f, dayCount: parseInt(e.target.value, 10) || 1 }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Ориентировочная цена (руб.)</label>
          <input
            type="number"
            min={0}
            value={form.suggestedPriceRub}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                suggestedPriceRub: e.target.value === '' ? '' : Number(e.target.value),
              }))
            }
            placeholder="например 5000"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Meta Title</label>
          <input
            type="text"
            value={form.metaTitle}
            onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Meta Description</label>
          <textarea
            value={form.metaDescription}
            onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Активен
            </label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Порядок (sortOrder)</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
              className="w-24 rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">JSON-поля</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">curatedEvents</label>
              <textarea
                value={form.curatedEvents}
                onChange={(e) => setForm((f) => ({ ...f, curatedEvents: e.target.value }))}
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">features</label>
              <textarea
                value={form.features}
                onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">includes</label>
              <textarea
                value={form.includes}
                onChange={(e) => setForm((f) => ({ ...f, includes: e.target.value }))}
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">faq</label>
              <textarea
                value={form.faq}
                onChange={(e) => setForm((f) => ({ ...f, faq: e.target.value }))}
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-primary-700"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          {!isCreate && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              Удалить
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/combos')}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Назад
          </button>
        </div>
      </form>
    </div>
  );
}
