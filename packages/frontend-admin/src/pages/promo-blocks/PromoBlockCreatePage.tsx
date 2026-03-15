import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { promoBlocksApi, type PromoBlockFormData } from '@/api/promo-blocks';
import { promoCollectionsApi, type PromoCollection } from '@/api/promo-collections';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PromoBlockForm } from './PromoBlockForm';

const defaultForm: PromoBlockFormData = {
  slug: '', title: '', description: '', href: '', contentMode: 'LINK_ONLY',
  iconSource: 'LIBRARY', bgMode: 'GRADIENT', priority: 0, sortOrder: 0, isActive: true,
};

export function PromoBlockCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<PromoBlockFormData>(defaultForm);
  const [collections, setCollections] = useState<PromoCollection[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    promoCollectionsApi.list().then(setCollections).catch(() => undefined);
  }, []);

  const handleSave = async () => {
    if (!form.slug.trim()) { toast.error('Slug обязателен'); return; }
    const contentMode = form.contentMode ?? 'LINK_ONLY';
    if (contentMode === 'LINK_ONLY' && !(form.href ?? '').trim()) {
      toast.error('Для LINK_ONLY ссылка (href) обязательна');
      return;
    }
    if (contentMode === 'COLLECTION' && !(form.collectionId ?? '').trim()) {
      toast.error('Для COLLECTION выберите коллекцию');
      return;
    }
    setSaving(true);
    try {
      await promoBlocksApi.create(form);
      toast.success('Промо-блок создан');
      navigate('/promo-blocks');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Новый промо-блок</h1>
        <p className="text-muted-foreground">Карточка на главной странице</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Данные промо-блока</CardTitle>
          <CardDescription>Slug, название, ссылка, иконка и фон</CardDescription>
        </CardHeader>
        <CardContent>
          <PromoBlockForm form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} collections={collections} />
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Сохранение...' : 'Создать'}</Button>
        <Button variant="outline" onClick={() => navigate('/promo-blocks')}>Отмена</Button>
      </div>
    </div>
  );
}
