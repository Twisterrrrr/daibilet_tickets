import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { FormActions, FormGrid, FormSection } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { SeoMetaEditor } from '@/components/SeoMetaEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

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
  const isNew = !id || id === 'new';
  const [city, setCity] = useState<CityDetail | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<CityDetail>>({});

  useEffect(() => {
    if (!id || isNew) return;
    setLoading(true);
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
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
      })
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const handleSave = () => {
    if (!id) return;
    if (isNew) {
      toast.error('Создание города пока не поддерживается текущим API');
      return;
    }
    setSaving(true);
    adminApi
      .put(`/admin/cities/${id}`, form)
      .then(() => {
        setCity((prev) => (prev ? { ...prev, ...form } : null));
        toast.success('Изменения сохранены');
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Ошибка сохранения'))
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (!city && !isNew) {
    return (
      <div className="space-y-4">
        <div className="text-destructive">Город не найден</div>
        <Button variant="outline" asChild>
          <Link to="/cities">← Назад</Link>
        </Button>
      </div>
    );
  }

  if (isNew) {
    const doneCount = [form.name, form.slug, form.description, form.heroImage].filter((x) => typeof x === 'string' && x.trim().length > 0).length;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/cities">
              <ArrowLeft className="h-4 w-4 mr-1" /> Назад
            </Link>
          </Button>
          <h1 className="text-2xl font-bold flex-1">Новый город</h1>
          <Button onClick={handleSave} disabled={saving} className="gap-1">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Основное</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium mb-1 block">Название *</Label>
                  <Input placeholder="Санкт-Петербург" value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Slug *</Label>
                  <Input className="font-mono text-sm" placeholder="spb" value={form.slug ?? ''} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Короткое описание *</Label>
                  <Input placeholder="Культурная столица России" value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1 block">Изображение *</Label>
                  <Input placeholder="https://..." value={form.heroImage ?? ''} onChange={(e) => setForm((f) => ({ ...f, heroImage: e.target.value }))} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  Заполненность
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-secondary text-secondary-foreground">
                    {doneCount}/4
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm"><span className={`w-2 h-2 rounded-full ${form.name ? 'bg-primary' : 'bg-muted-foreground/30'}`} /><span className="text-muted-foreground">Название</span></div>
                  <div className="flex items-center gap-2 text-sm"><span className={`w-2 h-2 rounded-full ${form.slug ? 'bg-primary' : 'bg-muted-foreground/30'}`} /><span className="text-muted-foreground">Slug</span></div>
                  <div className="flex items-center gap-2 text-sm"><span className={`w-2 h-2 rounded-full ${form.description ? 'bg-primary' : 'bg-muted-foreground/30'}`} /><span className="text-muted-foreground">Описание</span></div>
                  <div className="flex items-center gap-2 text-sm"><span className={`w-2 h-2 rounded-full ${form.heroImage ? 'bg-primary' : 'bg-muted-foreground/30'}`} /><span className="text-muted-foreground">Изображение</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Превью на главной</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <div className="h-24 bg-muted flex items-center justify-center text-muted-foreground text-xs">Нет изображения</div>
                  <div className="p-3">
                    <p className="font-semibold text-sm">{form.name || 'Название города'}</p>
                    <p className="text-xs text-muted-foreground">{form.description || 'Описание'}</p>
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <span>0 событий</span>
                      <span>0 площадок</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/cities">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Редактировать город</h1>
          <p className="text-muted-foreground">{city?.name ?? ''}</p>
        </div>
      </div>

      <FormSection
        title="Основные данные"
        description="Название, slug и основные настройки города"
      >
        <FormGrid>
          <div className="space-y-2">
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={form.name ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={form.slug ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="font-mono"
            />
          </div>
        </FormGrid>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isFeatured"
              checked={form.isFeatured ?? false}
              onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isFeatured" className="cursor-pointer font-normal">
              В топе
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive ?? false}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isActive" className="cursor-pointer font-normal">
              Активен
            </Label>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            rows={3}
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
      </FormSection>

      <FormSection
        title="Медиа"
        description="Hero изображение для лендинга"
      >
        <div className="space-y-2">
          <Label htmlFor="heroImage">Hero изображение (URL)</Label>
          <Input
            id="heroImage"
            type="text"
            value={form.heroImage ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, heroImage: e.target.value }))}
          />
        </div>
      </FormSection>

      <SeoMetaEditor
        entityType="CITY"
        entityId={id!}
        defaultTitle={form.name ?? undefined}
        previewPath={form.slug ? `/cities/${form.slug}` : '/cities/slug'}
      />

      <FormSection
        title="Legacy SEO (City)"
        description="metaTitle/metaDescription на модели City — fallback"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metaTitle">Meta title</Label>
            <Input
              id="metaTitle"
              value={form.metaTitle ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta description</Label>
            <Textarea
              id="metaDescription"
              rows={2}
              value={form.metaDescription ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Геолокация"
        description="Координаты и часовой пояс"
      >
        <div className="space-y-4">
          <FormGrid>
            <div className="space-y-2">
              <Label htmlFor="lat">Широта (lat)</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                value={form.lat ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Долгота (lng)</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                value={form.lng ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>
          </FormGrid>
          <div className="space-y-2">
            <Label htmlFor="timezone">Часовой пояс</Label>
            <Input
              id="timezone"
              placeholder="Europe/Moscow"
              value={form.timezone ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            />
          </div>
        </div>
        <FormActions
          primary={
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          }
        />
      </FormSection>
    </div>
  );
}
