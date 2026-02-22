import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { transliterate } from '@/lib/transliterate';

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
        }),
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
      toast.error(e instanceof Error ? e.message : 'Ошибка сохранения');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isCreate && !window.confirm('Удалить этот тег?')) return;
    setSaving(true);
    try {
      await adminApi.delete(`/admin/tags/${id}`);
      navigate('/tags');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка удаления');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tags">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isCreate ? 'Новый тег' : 'Редактирование тега'}</h1>
          <p className="text-muted-foreground">{isCreate ? 'Создание нового тега' : form.name || 'Редактирование'}</p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Основные данные</CardTitle>
            <CardDescription>Название, slug и категория тега</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input id="name" value={form.name} onChange={(e) => handleNameChange(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  required
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Категория</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as TagCategory }))}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isActive" className="cursor-pointer font-normal">
                Активен
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Контент</CardTitle>
            <CardDescription>Описание и медиа</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroImage">Hero Image (URL)</Label>
              <Input
                id="heroImage"
                type="text"
                value={form.heroImage}
                onChange={(e) => setForm((f) => ({ ...f, heroImage: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
            <CardDescription>Мета-теги для поисковых систем</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input
                id="metaTitle"
                value={form.metaTitle}
                onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea
                id="metaDescription"
                value={form.metaDescription}
                onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardFooter className="flex flex-wrap gap-3 pt-6">
            <Button type="submit" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
            {!isCreate && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                Удалить
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => navigate('/tags')}>
              Назад
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
