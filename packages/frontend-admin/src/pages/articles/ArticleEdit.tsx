import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { adminApi } from '../../api/client';
import { transliterate } from '../../lib/transliterate';

interface City {
  id: string;
  name: string;
  slug: string;
}

interface ArticleDetail {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  cityId: string | null;
  isPublished: boolean;
  publishedAt: string | null;
}

export function ArticleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreate = !id || id === 'new';

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<ArticleDetail>>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImage: '',
    metaTitle: '',
    metaDescription: '',
    cityId: null,
    isPublished: false,
    publishedAt: null,
  });

  useEffect(() => {
    adminApi
      .get<City[]>('/admin/cities')
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (isCreate) {
      setLoading(false);
      setForm({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        coverImage: '',
        metaTitle: '',
        metaDescription: '',
        cityId: null,
        isPublished: false,
        publishedAt: null,
      });
      return;
    }
    setLoading(true);
    setError(null);
    adminApi
      .get<ArticleDetail>(`/admin/articles/${id}`)
      .then((data) => {
        setArticle(data);
        setForm({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt ?? '',
          content: data.content,
          coverImage: data.coverImage ?? '',
          metaTitle: data.metaTitle ?? '',
          metaDescription: data.metaDescription ?? '',
          cityId: data.cityId,
          isPublished: data.isPublished,
          publishedAt: data.publishedAt,
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id, isCreate]);

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      ...(isCreate && !f.slug ? { slug: transliterate(title) } : {}),
    }));
  };

  const handleSave = () => {
    setError(null);
    const payload = {
      ...form,
      cityId: form.cityId || null,
      publishedAt: form.isPublished && !form.publishedAt ? new Date().toISOString() : form.publishedAt,
    };

    if (isCreate) {
      setSaving(true);
      adminApi
        .post<ArticleDetail>('/admin/articles', payload)
        .then((created) => navigate(`/articles/${created.id}`))
        .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка сохранения'))
        .finally(() => setSaving(false));
    } else if (id) {
      setSaving(true);
      adminApi
        .put(`/admin/articles/${id}`, payload)
        .then((updated) => {
          setArticle((prev) => (prev ? { ...prev, ...updated } : null));
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка сохранения'))
        .finally(() => setSaving(false));
    }
  };

  const handleDelete = () => {
    if (!id || isCreate || !confirm('Удалить статью?')) return;
    setDeleting(true);
    setError(null);
    adminApi
      .delete(`/admin/articles/${id}`)
      .then(() => navigate('/articles'))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка удаления'))
      .finally(() => setDeleting(false));
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-gray-400">Загрузка...</div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/articles"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Назад
        </Link>
        <h1 className="text-xl font-bold text-gray-900">
          {isCreate ? 'Новая статья' : 'Редактировать статью'}
        </h1>
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
                onChange={(e) => handleTitleChange(e.target.value)}
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
            <div>
              <label className="mb-1 block text-xs text-gray-500">Город</label>
              <select
                value={form.cityId ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cityId: e.target.value || null }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">— Не привязан</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={form.isPublished ?? false}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isPublished: e.target.checked,
                    publishedAt:
                      e.target.checked && !f.publishedAt
                        ? new Date().toISOString()
                        : f.publishedAt,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isPublished" className="text-sm text-gray-700">
                Опубликовано
              </label>
            </div>
            {form.isPublished && (
              <div>
                <label className="mb-1 block text-xs text-gray-500">Дата публикации</label>
                <input
                  type="datetime-local"
                  value={
                    form.publishedAt
                      ? new Date(form.publishedAt).toISOString().slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      publishedAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Краткое описание (excerpt)</label>
              <textarea
                rows={2}
                value={form.excerpt ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Обложка (URL)</label>
              <input
                type="text"
                value={form.coverImage ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Контент (Markdown)</label>
              <textarea
                rows={16}
                value={form.content ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">metaTitle</label>
              <input
                type="text"
                value={form.metaTitle ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">metaDescription</label>
              <input
                type="text"
                value={form.metaDescription ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            {!isCreate && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
