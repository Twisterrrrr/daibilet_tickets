import { useCallback, useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface EdoProfile {
  id: string;
  operatorId: string;
  provider: 'NOOP' | 'DIADOK';
  boxId: string | null;
  inn: string;
  kpp: string | null;
  isActive: boolean;
  statusHint?: 'INACTIVE' | 'INCOMPLETE' | 'READY';
  legalProfileExists?: boolean;
  docsEmail?: string | null;
  supplierLegalInn?: string | null;
}

interface SupplierEdoProfileViewProps {
  operatorId: string;
  defaultInn?: string | null;
}

export function SupplierEdoProfileView({ operatorId, defaultInn }: SupplierEdoProfileViewProps) {
  const [profile, setProfile] = useState<EdoProfile | null | undefined>(undefined);
  const [form, setForm] = useState({
    provider: 'NOOP' as 'NOOP' | 'DIADOK',
    boxId: '',
    inn: defaultInn || '',
    kpp: '',
    isActive: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const load = useCallback(() => {
    adminApi
      .get<EdoProfile | null>(`/admin/suppliers/${operatorId}/edo-profile`)
      .then((data) => {
        setProfile(data ?? null);
        if (data) {
          setForm({
            provider: data.provider,
            boxId: data.boxId || '',
            inn: data.inn,
            kpp: data.kpp || '',
            isActive: data.isActive,
          });
        } else {
          setForm((prev) => ({ ...prev, inn: defaultInn || prev.inn }));
        }
      })
      .catch(() => setProfile(null));
  }, [operatorId, defaultInn]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form.inn.trim()) {
      toast.error('ИНН обязателен');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.put(`/admin/suppliers/${operatorId}/edo-profile`, {
        provider: form.provider,
        boxId: form.boxId.trim() || null,
        inn: form.inn.trim(),
        kpp: form.kpp.trim() || null,
        isActive: form.isActive,
      });
      toast.success('Профиль ЭДО сохранён');
      setEditMode(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (profile === undefined) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse text-muted-foreground">Загрузка ЭДО...</div>
        </CardContent>
      </Card>
    );
  }

  const statusLabel =
    profile?.statusHint === 'READY'
      ? 'Готов'
      : profile?.statusHint === 'INCOMPLETE'
        ? 'Неполный'
        : profile?.statusHint === 'INACTIVE'
          ? 'Неактивен'
          : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">ЭДО (электронный документооборот)</h3>
        </div>
        {profile && statusLabel && (
          <Badge variant={profile.statusHint === 'READY' ? 'success' : 'secondary'}>{statusLabel}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {profile === null && !editMode ? (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              Профиль ЭДО не настроен. Настройте отправку актов и документов поставщику.
            </p>
            <Button onClick={() => setEditMode(true)}>Настроить ЭДО</Button>
          </div>
        ) : (
          <>
            {(!editMode && profile) || editMode ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Провайдер</label>
                  <select
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value as 'NOOP' | 'DIADOK' })}
                    disabled={!editMode}
                    className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-muted"
                  >
                    <option value="NOOP">NOOP (заглушка, без отправки)</option>
                    <option value="DIADOK">Диадок</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">ИНН</label>
                  <input
                    type="text"
                    value={form.inn}
                    onChange={(e) => setForm({ ...form, inn: e.target.value })}
                    disabled={!editMode}
                    placeholder="10–12 цифр"
                    className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-muted"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">КПП</label>
                  <input
                    type="text"
                    value={form.kpp}
                    onChange={(e) => setForm({ ...form, kpp: e.target.value })}
                    disabled={!editMode}
                    placeholder="Опционально"
                    className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-muted"
                  />
                </div>
                {form.provider === 'DIADOK' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">ID ящика (boxId)</label>
                    <input
                      type="text"
                      value={form.boxId}
                      onChange={(e) => setForm({ ...form, boxId: e.target.value })}
                      disabled={!editMode}
                      placeholder="Обязателен для DIADOK"
                      className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-muted"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    id="edo-active"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    disabled={!editMode}
                    className="rounded border"
                  />
                  <label htmlFor="edo-active" className="text-sm">
                    Профиль активен (документы отправляются)
                  </label>
                </div>
              </div>
            ) : null}

            {editMode ? (
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={submitting}>
                  Сохранить
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)} disabled={submitting}>
                  Отмена
                </Button>
              </div>
            ) : (
              profile && (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  Редактировать
                </Button>
              )
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
