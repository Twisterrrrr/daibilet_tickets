import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/client';

interface CityItem {
  id: string;
  name: string;
  slug: string;
}

interface LandingForm {
  slug: string;
  cityId: string;
  filterTag: string;
  title: string;
  subtitle: string;
  heroText: string;
  metaTitle: string;
  metaDescription: string;
  legalText: string;
  isActive: boolean;
  sortOrder: number;
  howToChoose: string;
  infoBlocks: string;
  faq: string;
  reviews: string;
  stats: string;
  relatedLinks: string;
  additionalFilters: string;
}

const JSON_FIELDS = [
  'howToChoose',
  'infoBlocks',
  'faq',
  'reviews',
  'stats',
  'relatedLinks',
  'additionalFilters',
] as const;

const EMPTY_FORM: LandingForm = {
  slug: '',
  cityId: '',
  filterTag: '',
  title: '',
  subtitle: '',
  heroText: '',
  metaTitle: '',
  metaDescription: '',
  legalText: '',
  isActive: true,
  sortOrder: 0,
  howToChoose: '[]',
  infoBlocks: '[]',
  faq: '[]',
  reviews: '[]',
  stats: '{}',
  relatedLinks: '[]',
  additionalFilters: '{}',
};

function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    if (!str.trim()) return fallback;
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

export function LandingEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCreate = !id || id === 'new';

  const [form, setForm] = useState<LandingForm>(EMPTY_FORM);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .get<CityItem[] | { items: CityItem[] }>('/admin/cities')
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as any).items ?? [];
        setCities(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isCreate) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    adminApi
      .get<any>(`/admin/landings/${id}`)
      .then((data) => {
        setForm({
          slug: data.slug ?? '',
          cityId: data.cityId ?? '',
          filterTag: data.filterTag ?? '',
          title: data.title ?? '',
          subtitle: data.subtitle ?? '',
          heroText: data.heroText ?? '',
          metaTitle: data.metaTitle ?? '',
          metaDescription: data.metaDescription ?? '',
          legalText: data.legalText ?? '',
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder ?? 0,
          howToChoose: JSON.stringify(data.howToChoose ?? [], null, 2),
          infoBlocks: JSON.stringify(data.infoBlocks ?? [], null, 2),
          faq: JSON.stringify(data.faq ?? [], null, 2),
          reviews: JSON.stringify(data.reviews ?? [], null, 2),
          stats: JSON.stringify(data.stats ?? {}, null, 2),
          relatedLinks: JSON.stringify(data.relatedLinks ?? [], null, 2),
          additionalFilters: JSON.stringify(data.additionalFilters ?? {}, null, 2),
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id, isCreate]);

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      slug: form.slug,
      cityId: form.cityId,
      filterTag: form.filterTag,
      title: form.title,
      subtitle: form.subtitle || null,
      heroText: form.heroText || null,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      legalText: form.legalText || null,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    };
    payload.howToChoose = safeJsonParse(form.howToChoose, []);
    payload.infoBlocks = safeJsonParse(form.infoBlocks, []);
    payload.faq = safeJsonParse(form.faq, []);
    payload.reviews = safeJsonParse(form.reviews, []);
    payload.stats = safeJsonParse(form.stats, {});
    payload.relatedLinks = safeJsonParse(form.relatedLinks, []);
    payload.additionalFilters = safeJsonParse(form.additionalFilters, {});
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isCreate) {
        await adminApi.post('/admin/landings', buildPayload());
        navigate('/landings');
      } else {
        await adminApi.put(`/admin/landings/${id}`, buildPayload());
        navigate('/landings');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isCreate && !window.confirm('Удалить этот лендинг?')) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.delete(`/admin/landings/${id}`);
      navigate('/landings');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка удаления');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-400">Загрузка...</div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">
        {isCreate ? 'Новый лендинг' : 'Редактирование лендинга'}
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

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
          <label className="mb-1 block text-sm font-medium text-gray-700">Фильтр-тег (slug)</label>
          <input
            type="text"
            value={form.filterTag}
            onChange={(e) => setForm((f) => ({ ...f, filterTag: e.target.value }))}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Заголовок (H1)</label>
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
          <label className="mb-1 block text-sm font-medium text-gray-700">Hero текст</label>
          <textarea
            value={form.heroText}
            onChange={(e) => setForm((f) => ({ ...f, heroText: e.target.value }))}
            rows={3}
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
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Юридический текст</label>
          <textarea
            value={form.legalText}
            onChange={(e) => setForm((f) => ({ ...f, legalText: e.target.value }))}
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
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))
              }
              className="w-24 rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">JSON-поля</h2>
          <div className="space-y-4">
            {JSON_FIELDS.map((key) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-gray-600">{key}</label>
                <textarea
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            ))}
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
            onClick={() => navigate('/landings')}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Назад
          </button>
        </div>
      </form>
    </div>
  );
}
