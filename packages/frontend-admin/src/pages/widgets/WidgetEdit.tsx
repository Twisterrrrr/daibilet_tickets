import { ArrowLeft, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface Provider {
  id: string;
  kind: string;
  name: string;
}

interface WidgetForm {
  providerId: string;
  externalId: string;
  title: string;
  url: string;
  isActive: boolean;
}

const EMPTY_FORM: WidgetForm = {
  providerId: '',
  externalId: '',
  title: '',
  url: '',
  isActive: true,
};

export function WidgetEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCreate = !id || id === 'new';

  const [form, setForm] = useState<WidgetForm>(EMPTY_FORM);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .get<Provider[]>('/admin/widgets/providers')
      .then(setProviders)
      .catch(() => setProviders([]));
  }, []);

  useEffect(() => {
    if (isCreate) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    adminApi
      .get<WidgetForm & { id: string }>(`/admin/widgets/${id}`)
      .then((data) =>
        setForm({
          providerId: data.providerId ?? '',
          externalId: data.externalId ?? '',
          title: data.title ?? '',
          url: data.url ?? '',
          isActive: data.isActive ?? true,
        }),
      )
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id, isCreate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isCreate) {
        await adminApi.post('/admin/widgets', {
          ...form,
          title: form.title || null,
          url: form.url || null,
        });
        navigate('/widgets');
      } else {
        await adminApi.patch(`/admin/widgets/${id}`, {
          title: form.title || null,
          url: form.url || null,
          isActive: form.isActive,
        });
        navigate('/widgets');
      }
      toast.success('Сохранено');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка сохранения');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isCreate && !window.confirm('Удалить этот виджет?')) return;
    setSaving(true);
    try {
      await adminApi.delete(`/admin/widgets/${id}`);
      toast.success('Удалено');
      navigate('/widgets');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка удаления');
      setSaving(false);
    }
  };

  const copyWidgetId = () => {
    navigator.clipboard.writeText(form.externalId).then(
      () => toast.success('Widget ID скопирован'),
      () => toast.error('Не удалось скопировать'),
    );
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/widgets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isCreate ? 'Новый виджет' : 'Редактирование виджета'}
          </h1>
          <p className="text-muted-foreground">
            {isCreate ? 'Добавить виджет teplohod.info' : form.title || form.externalId || 'Редактирование'}
          </p>
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
            <CardTitle>Данные виджета</CardTitle>
            <CardDescription>
              Widget ID — идентификатор виджета на teplohod.info. Кнопка копирования для вставки в коде.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="providerId">Провайдер</Label>
              <select
                id="providerId"
                value={form.providerId}
                onChange={(e) => setForm((f) => ({ ...f, providerId: e.target.value }))}
                required
                disabled={!isCreate}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Выберите провайдера</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="externalId">Widget ID (externalId)</Label>
              <div className="flex gap-2">
                <Input
                  id="externalId"
                  value={form.externalId}
                  onChange={(e) => setForm((f) => ({ ...f, externalId: e.target.value }))}
                  required
                  disabled={!isCreate}
                  className="font-mono"
                />
                <Button type="button" variant="outline" size="icon" onClick={copyWidgetId} title="Копировать">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Название (опционально)</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL (опционально)</Label>
              <Input
                id="url"
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
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
          <CardFooter className="flex flex-wrap gap-3 pt-6">
            <Button type="submit" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
            {!isCreate && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                Удалить
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => navigate('/widgets')}>
              Назад
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
