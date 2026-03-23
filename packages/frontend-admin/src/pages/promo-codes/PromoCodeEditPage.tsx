import { Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { PageHeader } from '@daibilet/shared-ui';

import { promoCodesApi, type PromoCode, type PromoCodeFormData } from '@/api/promo-codes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export function PromoCodeEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [promo, setPromo] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<PromoCodeFormData>({
    code: '',
    type: 'PERCENT',
    value: 10,
    isActive: true,
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    if (!id) return;
    setLoading(true);
    promoCodesApi
      .get(id)
      .then((p) => {
        setPromo(p);
        setForm({
          code: p.code,
          type: p.type,
          value: p.value,
          operatorId: p.operatorId ?? null,
          eventId: p.eventId ?? null,
          validFrom: p.validFrom ?? null,
          validTo: p.validTo ?? null,
          maxUses: p.maxUses ?? null,
          isActive: p.isActive,
        });
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
        navigate('/promo-codes');
      })
      .finally(() => setLoading(false));
  }, [id, isNew, navigate]);

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error('Код промо обязателен');
      return;
    }
    if (form.value <= 0) {
      toast.error('Значение скидки должно быть больше 0');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const created = await promoCodesApi.create(form);
        toast.success('Промокод создан');
        navigate(`/promo-codes/${created.id}`, { replace: true });
      } else if (id) {
        const updated = await promoCodesApi.update(id, form);
        setPromo(updated);
        toast.success('Сохранено');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || isNew) return;
    if (!window.confirm('Удалить промокод?')) return;
    setSaving(true);
    try {
      await promoCodesApi.delete(id);
      toast.success('Промокод удалён');
      navigate('/promo-codes');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPercent = form.type === 'PERCENT';

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title={isNew ? 'Новый промокод' : `Промокод ${promo?.code ?? ''}`}
        subtitle="Скидка по коду для checkout"
        actions={
          !isNew ? (
            <Button variant="outline" size="icon" onClick={handleDelete} disabled={saving}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Основное</CardTitle>
          <CardDescription>Код, тип скидки и статус</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Код</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="SPRING2026"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Тип скидки</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, type: value as PromoCodeFormData['type'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">% от суммы</SelectItem>
                  <SelectItem value="FIXED">Фиксированная сумма</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Значение</Label>
              <Input
                type="number"
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: Number(e.target.value) || 0 }))
                }
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                {isPercent ? 'Проценты (0–100)' : 'Сумма в копейках'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Активен</p>
              <p className="text-xs text-muted-foreground">
                Выключенный промокод игнорируется при checkout
              </p>
            </div>
            <Switch
              checked={form.isActive ?? true}
              onCheckedChange={(checked: boolean) =>
                setForm((f) => ({ ...f, isActive: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ограничения</CardTitle>
          <CardDescription>Период действия и лимиты</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Начало действия</Label>
              <Input
                type="datetime-local"
                value={form.validFrom ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, validFrom: e.target.value || null }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Окончание действия</Label>
              <Input
                type="datetime-local"
                value={form.validTo ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, validTo: e.target.value || null }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Максимальное число использований</Label>
              <Input
                type="number"
                min={1}
                value={form.maxUses ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    maxUses: e.target.value ? Number(e.target.value) || 0 : null,
                  }))
                }
              />
            </div>
            {!isNew && promo && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Статистика</Label>
                <p className="text-sm">
                  Использовано{' '}
                  <span className="font-mono">
                    {promo.usedCount}
                    {promo.maxUses ? ` / ${promo.maxUses}` : ''}
                  </span>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className={cn('flex justify-end gap-2')}>
        <Button variant="outline" onClick={() => navigate('/promo-codes')} disabled={saving}>
          Отмена
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить
        </Button>
      </div>
    </div>
  );
}

