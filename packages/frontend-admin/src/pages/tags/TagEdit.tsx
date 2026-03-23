import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState, FormActions, PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { transliterate } from '@/lib/transliterate';

type TagCategory = 'THEME' | 'AUDIENCE' | 'SEASON' | 'SPECIAL';
type TagKind = 'STRUCTURAL' | 'POPULAR';
type StructuralTagGroup = 'THEME' | 'AUDIENCE' | 'FORMAT';

interface TagForm {
  name: string;
  slug: string;
  category: TagCategory;
  code?: string;
  tagKind?: TagKind;
  structuralGroup?: StructuralTagGroup | null;
  nameEn?: string;
  description: string;
  heroImage: string;
  metaTitle: string;
  metaDescription: string;
  isFeatured?: boolean;
  sortOrder?: number;
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
  tagKind: 'STRUCTURAL',
  structuralGroup: 'THEME',
  description: '',
  heroImage: '',
  metaTitle: '',
  metaDescription: '',
  isFeatured: false,
  sortOrder: 0,
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
          code: data.code ?? '',
          tagKind: data.tagKind ?? undefined,
          structuralGroup: data.structuralGroup ?? null,
          nameEn: data.nameEn ?? '',
          description: data.description ?? '',
          heroImage: data.heroImage ?? '',
          metaTitle: data.metaTitle ?? '',
          metaDescription: data.metaDescription ?? '',
          isFeatured: data.isFeatured ?? false,
          sortOrder: data.sortOrder ?? 0,
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
      } else {
        await adminApi.patch(`/admin/tags/${id}`, form);
      }
      navigate('/tags');
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
      <PageHeader
        title={isCreate ? 'Новый тег' : 'Редактирование тега'}
        subtitle={isCreate ? 'Создание нового тега' : form.name || 'Редактирование'}
        actions={
          <Button variant="ghost" size="icon" asChild>
            <Link to="/tags">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {error && (
        <ErrorState title="Ошибка загрузки тега" description={error} />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tagKind">Слой (tagKind)</Label>
                <Select
                  value={form.tagKind ?? ''}
                  onValueChange={(v) => {
                    if (!v) {
                      setForm((f) => ({ ...f, tagKind: undefined, structuralGroup: null }));
                      return;
                    }
                    const nextKind = v as TagKind;
                    setForm((f) => ({
                      ...f,
                      tagKind: nextKind,
                      structuralGroup: nextKind === 'STRUCTURAL' ? (f.structuralGroup ?? 'THEME') : null,
                    }));
                  }}
                >
                  <SelectTrigger id="tagKind">
                    <SelectValue placeholder="Выберите слой" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">(не задано)</SelectItem>
                    <SelectItem value="STRUCTURAL">STRUCTURAL</SelectItem>
                    <SelectItem value="POPULAR">POPULAR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="structuralGroup">Группа (structuralGroup)</Label>
                <Select
                  value={form.structuralGroup ?? ''}
                  onValueChange={(v) => setForm((f) => ({ ...f, structuralGroup: (v as StructuralTagGroup) || null }))}
                  disabled={form.tagKind !== 'STRUCTURAL'}
                >
                  <SelectTrigger id="structuralGroup">
                    <SelectValue placeholder="Выберите группу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THEME">THEME</SelectItem>
                    <SelectItem value="AUDIENCE">AUDIENCE</SelectItem>
                    <SelectItem value="FORMAT">FORMAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">code</Label>
                <Input id="code" value={form.code ?? ''} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">nameEn</Label>
                <Input
                  id="nameEn"
                  value={form.nameEn ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                  placeholder="необязательно"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">sortOrder</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={form.sortOrder ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value === '' ? 0 : Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={form.isFeatured ?? false}
                  onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="isFeatured" className="cursor-pointer font-normal">
                  isFeatured
                </Label>
              </div>
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

        <FormActions
          primary={
            <Button type="submit" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          }
          secondary={
            <>
              {!isCreate && (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                  Удалить
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => navigate('/tags')}>
                Назад
              </Button>
            </>
          }
        />
      </form>
    </div>
  );
}
