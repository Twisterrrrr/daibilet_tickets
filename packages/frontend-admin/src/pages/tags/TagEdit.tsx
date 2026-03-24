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
import { transliterate } from '@/lib/transliterate';

type TagCategory = 'THEME' | 'AUDIENCE' | 'SEASON' | 'SPECIAL';
type TagKind = 'STRUCTURAL' | 'POPULAR';
type StructuralTagGroup = 'THEME' | 'AUDIENCE' | 'FORMAT';
type TagUiCategory = 'THEME' | 'AUDIENCE' | 'FORMAT' | 'SEASON' | 'POPULAR';
const NONE_VALUE = '__none__';

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

const ALL_CATEGORY_OPTIONS: { value: TagUiCategory; label: string }[] = [
  { value: 'THEME', label: 'Тематика' },
  { value: 'AUDIENCE', label: 'Аудитория' },
  { value: 'FORMAT', label: 'Формат' },
  { value: 'SEASON', label: 'Сезонность' },
  { value: 'POPULAR', label: 'Популярный' },
];

function uiCategoryToInternal(ui: TagUiCategory): {
  category: TagCategory;
  tagKind: TagKind;
  structuralGroup: StructuralTagGroup | null;
} {
  if (ui === 'THEME') return { category: 'THEME', tagKind: 'STRUCTURAL', structuralGroup: 'THEME' };
  if (ui === 'AUDIENCE') return { category: 'AUDIENCE', tagKind: 'STRUCTURAL', structuralGroup: 'AUDIENCE' };
  if (ui === 'FORMAT') return { category: 'SPECIAL', tagKind: 'STRUCTURAL', structuralGroup: 'FORMAT' };
  if (ui === 'SEASON') return { category: 'SEASON', tagKind: 'STRUCTURAL', structuralGroup: 'THEME' };
  return { category: 'SPECIAL', tagKind: 'POPULAR', structuralGroup: null };
}

function internalToUiCategory(form: TagForm): TagUiCategory {
  if (form.tagKind === 'POPULAR') return 'POPULAR';
  if (form.structuralGroup === 'FORMAT') return 'FORMAT';
  if (form.category === 'SPECIAL') return 'FORMAT';
  if (form.category === 'AUDIENCE') return 'AUDIENCE';
  if (form.category === 'SEASON') return 'SEASON';
  return 'THEME';
}

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
  const [uiCategory, setUiCategory] = useState<TagUiCategory>('THEME');
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryOptions = isCreate
    ? ALL_CATEGORY_OPTIONS.filter((o) => o.value !== 'FORMAT')
    : ALL_CATEGORY_OPTIONS;

  useEffect(() => {
    if (isCreate) {
      setUiCategory('THEME');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    adminApi
      .get<TagForm & { id: string }>(`/admin/tags/${id}`)
      .then((data) =>
        {
          const nextForm = {
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
          };
          setForm(nextForm);
          setUiCategory(internalToUiCategory(nextForm));
        }
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
    const mapping = uiCategoryToInternal(uiCategory);
    const payload = {
      ...form,
      category: mapping.category,
      tagKind: mapping.tagKind,
      structuralGroup: mapping.structuralGroup,
    };
    try {
      if (isCreate) {
        await adminApi.post('/admin/tags', payload);
      } else {
        await adminApi.patch(`/admin/tags/${id}`, payload);
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
                value={uiCategory}
                onValueChange={(v) => {
                  const next = v as TagUiCategory;
                  setUiCategory(next);
                  const mapping = uiCategoryToInternal(next);
                  setForm((f) => ({
                    ...f,
                    category: mapping.category,
                    tagKind: mapping.tagKind,
                    structuralGroup: mapping.structuralGroup,
                  }));
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((o) => (
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
