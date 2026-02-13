import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi } from '@/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
const CATEGORY_OPTIONS = [
  { value: 'food', label: 'food' },
  { value: 'transport', label: 'transport' },
  { value: 'vip', label: 'vip' },
  { value: 'photo', label: 'photo' },
  { value: 'souvenir', label: 'souvenir' },
];

export function UpsellEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState({
    title: '',
    description: '',
    priceKopecks: 0,
    category: 'food',
    citySlug: '',
    icon: '',
    isActive: true,
    sortOrder: 0,
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      adminApi.get(`/admin/upsells/${id}`).then((data: any) => {
        setForm({
          title: data.title || '',
          description: data.description || '',
          priceKopecks: data.priceKopecks || 0,
          category: data.category || 'food',
          citySlug: data.citySlug || '',
          icon: data.icon || '',
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder || 0,
        });
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, citySlug: form.citySlug || null };
      if (isNew) {
        await adminApi.post('/admin/upsells', payload);
      } else {
        await adminApi.patch(`/admin/upsells/${id}`, payload);
      }
      toast.success('Сохранено');
      navigate('/upsells');
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? 'Новый Upsell' : 'Редактировать Upsell'}
        </h1>
        <p className="text-muted-foreground">Дополнительное предложение для бронирования</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основные данные</CardTitle>
          <CardDescription>Название, иконка и описание</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Название upsell"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Иконка</Label>
              <Input
                id="icon"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="🍽️"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Описание предложения"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Цена и категория</CardTitle>
          <CardDescription>Стоимость, категория и привязка к городу</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="priceKopecks">Цена (коп.)</Label>
              <Input
                id="priceKopecks"
                type="number"
                value={form.priceKopecks}
                onChange={(e) => setForm((f) => ({ ...f, priceKopecks: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">
                {(form.priceKopecks / 100).toLocaleString('ru-RU')} ₽
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Категория</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger id="category">
                  <SelectValue />
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
            <div className="space-y-2">
              <Label htmlFor="citySlug">Город (slug)</Label>
              <Input
                id="citySlug"
                value={form.citySlug}
                onChange={(e) => setForm((f) => ({ ...f, citySlug: e.target.value }))}
                placeholder="Пусто = все"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Настройки</CardTitle>
          <CardDescription>Порядок сортировки и активность</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Порядок сортировки</Label>
              <Input
                id="sortOrder"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select
                value={form.isActive ? 'true' : 'false'}
                onValueChange={(v) => setForm((f) => ({ ...f, isActive: v === 'true' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Активен</SelectItem>
                  <SelectItem value="false">Выключен</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/upsells')}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
