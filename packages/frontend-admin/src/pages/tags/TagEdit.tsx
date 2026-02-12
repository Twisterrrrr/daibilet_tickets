import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/client';
import { transliterate } from '../../lib/transliterate';

type TagCategory = 'THEME' | 'AUDIENCE' | 'SEASON' | 'SPECIAL';

interface TagForm {
  name: string;
  slug: string;
  category: TagCategory;
  description: string;
  heroImage: string;
  metaTitle: string;
  metaDescription: string;
  isActive: boolean;
}

const CATEGORY_OPTIONS: { value: TagCategory; label: string }[] = [
  { value: 'THEME', label: 'Тема' },
  { value: 'AUDIENCE', label: 'Аудитория' },
  { value: 'SEASON', label: 'Сезон' },
  { value: 'SPECIAL', label: 'Специальный' },
];

const EMPTY_FORM: TagForm = {
  name: '',
  slug: '',
  category: 'THEME',
  description: '',
  heroImage: '',
  metaTitle: '',
  metaDescription: '',
  isActive: true,
};

export function TagEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCreate = !id || id === 'new';

  const [form, setForm] = useState<TagForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreate) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    adminApi
      .get<TagForm & { id: string }>(`/admin/tags/${id}`)
      .then((data) =>
        setForm({
          name: data.name ?? '',
          slug: data.slug ?? '',
          category: data.category ?? 'THEME',
          description: data.description ?? '',
          heroImage: data.heroImage ?? '',
          metaTitle: data.metaTitle ?? '',
          metaDescription: data.metaDescription ?? '',
          isActive: data.isActive ?? true,
        })
      )
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id, isCreate]);

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      ...(isCreate && !f.slug ? { slug: transliterate(name) } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isCreate) {
        await adminApi.post('/admin/tags', form);
        navigate('/tags');
      } else {
        await adminApi.put(`/admin/tags/${id}`, form);
        navigate('/tags');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isCreate && !window.confirm('Удалить этот тег?')) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.delete(`/admin/tags/${id}`);
      navigate('/tags');
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
        {isCreate ? 'Новый тег' : 'Редактирование тега'}
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Название</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
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
          <label className="mb-1 block text-sm font-medium text-gray-700">Категория</label>
          <select
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value as TagCategory }))
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Описание</label>
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
            onClick={() => navigate('/tags')}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Назад
          </button>
        </div>
      </form>
    </div>
  );
}
