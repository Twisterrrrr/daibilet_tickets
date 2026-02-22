import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Page ────────────────────────────────────────────────────────────────────

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
        const list = Array.isArray(res) ? res : ((res as { items: CityItem[] }).items ?? []);
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
      .get<Record<string, unknown>>(`/admin/landings/${id}`)
      .then((data) => {
        setForm({
          slug: (data.slug as string) ?? '',
          cityId: (data.cityId as string) ?? '',
          filterTag: (data.filterTag as string) ?? '',
          title: (data.title as string) ?? '',
          subtitle: (data.subtitle as string) ?? '',
          heroText: (data.heroText as string) ?? '',
          metaTitle: (data.metaTitle as string) ?? '',
          metaDescription: (data.metaDescription as string) ?? '',
          legalText: (data.legalText as string) ?? '',
          isActive: (data.isActive as boolean) ?? true,
          sortOrder: (data.sortOrder as number) ?? 0,
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
      toast.error(e instanceof Error ? e.message : 'Ошибка сохранения');
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
      toast.error(e instanceof Error ? e.message : 'Ошибка удаления');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isCreate ? 'Новый лендинг' : 'Редактирование лендинга'}
          </h1>
          <p className="text-muted-foreground">
            {isCreate ? 'Создайте новый лендинг для города и тега' : 'Изменения сохранятся при нажатии «Сохранить»'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/landings')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle>Основные данные</CardTitle>
            <CardDescription>Slug, город, фильтр-тег и заголовки</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Город</Label>
                <Select
                  value={form.cityId || '__none__'}
                  onValueChange={(v) => setForm((f) => ({ ...f, cityId: v === '__none__' ? '' : v }))}
                  required
                >
                  <SelectTrigger id="city">
                    <SelectValue placeholder="Выберите город" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Выберите город</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterTag">Фильтр-тег (slug)</Label>
              <Input
                id="filterTag"
                value={form.filterTag}
                onChange={(e) => setForm((f) => ({ ...f, filterTag: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Заголовок (H1)</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Подзаголовок</Label>
                <Input
                  id="subtitle"
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroText">Hero текст</Label>
              <Textarea
                id="heroText"
                value={form.heroText}
                onChange={(e) => setForm((f) => ({ ...f, heroText: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className={cn('h-4 w-4 rounded border-input accent-primary')}
                />
                <Label htmlFor="isActive" className="cursor-pointer font-normal">
                  Активен
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Порядок</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  className="w-24"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SEO & legal */}
        <Card>
          <CardHeader>
            <CardTitle>SEO и юридический текст</CardTitle>
            <CardDescription>Meta-теги и правовая информация</CardDescription>
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
            <div className="space-y-2">
              <Label htmlFor="legalText">Юридический текст</Label>
              <Textarea
                id="legalText"
                value={form.legalText}
                onChange={(e) => setForm((f) => ({ ...f, legalText: e.target.value }))}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* JSON fields */}
        <Card>
          <CardHeader>
            <CardTitle>JSON-поля</CardTitle>
            <CardDescription>
              howToChoose, infoBlocks, faq, reviews, stats, relatedLinks, additionalFilters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {JSON_FIELDS.map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{key}</Label>
                <Textarea
                  id={key}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Separator />

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
          {!isCreate && (
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Удалить
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => navigate('/landings')}>
            Отмена
          </Button>
        </div>
      </form>
    </div>
  );
}
