import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { adminApi } from '@/api/client';
import { SeoMetaEditor } from '@/components/SeoMetaEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [city, setCity] = useState<CityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<CityDetail>>({});

  useEffect(() => {
    if (!id) return;
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
  }, [id]);

  const handleSave = () => {
    if (!id) return;
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
  if (!city) {
    return (
      <div className="space-y-4">
        <div className="text-destructive">Город не найден</div>
        <Button variant="outline" asChild>
          <Link to="/cities">← Назад</Link>
        </Button>
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
          <p className="text-muted-foreground">{city.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основные данные</CardTitle>
          <CardDescription>Название, slug и основные настройки города</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Медиа</CardTitle>
          <CardDescription>Hero изображение для лендинга</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="heroImage">Hero изображение (URL)</Label>
            <Input
              id="heroImage"
              type="text"
              value={form.heroImage ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, heroImage: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <SeoMetaEditor entityType="CITY" entityId={id!} defaultTitle={form.name ?? undefined} />

      <Card>
        <CardHeader>
          <CardTitle>Legacy SEO (City)</CardTitle>
          <CardDescription>metaTitle/metaDescription на модели City — fallback</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Геолокация</CardTitle>
          <CardDescription>Координаты и часовой пояс</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Часовой пояс</Label>
            <Input
              id="timezone"
              placeholder="Europe/Moscow"
              value={form.timezone ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
