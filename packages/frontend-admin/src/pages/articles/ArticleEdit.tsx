import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { transliterate } from '@/lib/transliterate';
import { cn } from '@/lib/utils';

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
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Ошибка загрузки'))
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
    const payload = {
      ...form,
      cityId: form.cityId || null,
      publishedAt: form.isPublished && !form.publishedAt ? new Date().toISOString() : form.publishedAt,
    };

    if (isCreate) {
      setSaving(true);
      adminApi
        .post<ArticleDetail>('/admin/articles', payload)
        .then((created) => {
          toast.success('Статья создана');
          navigate(`/articles/${created.id}`);
        })
        .catch((e) => toast.error(e instanceof Error ? e.message : 'Ошибка сохранения'))
        .finally(() => setSaving(false));
    } else if (id) {
      setSaving(true);
      adminApi
        .put(`/admin/articles/${id}`, payload)
        .then((updated) => {
          setArticle((prev) => (prev ? { ...prev, ...updated } : null));
          toast.success('Сохранено');
        })
        .catch((e) => toast.error(e instanceof Error ? e.message : 'Ошибка сохранения'))
        .finally(() => setSaving(false));
    }
  };

  const handleDelete = () => {
    if (!id || isCreate || !confirm('Удалить статью?')) return;
    setDeleting(true);
    adminApi
      .delete(`/admin/articles/${id}`)
      .then(() => {
        toast.success('Статья удалена');
        navigate('/articles');
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Ошибка удаления'))
      .finally(() => setDeleting(false));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/articles" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{isCreate ? 'Новая статья' : 'Редактировать статью'}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основные данные</CardTitle>
          <CardDescription>Заполните поля статьи. Slug генерируется автоматически при создании.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={form.title ?? ''}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Заголовок статьи"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="url-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Город</Label>
              <Select
                value={form.cityId ?? '__none__'}
                onValueChange={(v) => setForm((f) => ({ ...f, cityId: v === '__none__' ? null : v }))}
              >
                <SelectTrigger id="city">
                  <SelectValue placeholder="Не привязан" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Не привязан</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    publishedAt: e.target.checked && !f.publishedAt ? new Date().toISOString() : f.publishedAt,
                  }))
                }
                className={cn(
                  'h-4 w-4 rounded border-input accent-primary',
                  'focus:ring-2 focus:ring-ring focus:ring-offset-2',
                )}
              />
              <Label htmlFor="isPublished" className="cursor-pointer font-normal">
                Опубликовано
              </Label>
            </div>
            {form.isPublished && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="publishedAt">Дата публикации</Label>
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  value={form.publishedAt ? new Date(form.publishedAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      publishedAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    }))
                  }
                />
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="excerpt">Краткое описание (excerpt)</Label>
            <Textarea
              id="excerpt"
              rows={2}
              value={form.excerpt ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              placeholder="Краткое описание для превью"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverImage">Обложка (URL)</Label>
            <Input
              id="coverImage"
              type="text"
              value={form.coverImage ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Контент (Markdown)</Label>
            <Textarea
              id="content"
              rows={16}
              value={form.content ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="font-mono text-sm"
              placeholder="# Заголовок..."
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="metaTitle">metaTitle</Label>
              <Input
                id="metaTitle"
                value={form.metaTitle ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))}
                placeholder="SEO заголовок"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metaDescription">metaDescription</Label>
              <Input
                id="metaDescription"
                value={form.metaDescription ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
                placeholder="SEO описание"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
            {!isCreate && (
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Удаление...' : 'Удалить'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
