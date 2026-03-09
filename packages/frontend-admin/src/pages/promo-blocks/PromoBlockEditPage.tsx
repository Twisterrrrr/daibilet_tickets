import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { promoBlocksApi, type PromoBlockFormData } from '@/api/promo-blocks';
import { promoCollectionsApi, type PromoCollection } from '@/api/promo-collections';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PromoBlockForm } from './PromoBlockForm';

export function PromoBlockEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState<PromoBlockFormData | null>(null);
  const [collections, setCollections] = useState<PromoCollection[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    promoCollectionsApi.list().then(setCollections).catch(() => { /* noop */ });
  }, []);

  useEffect(() => {
    if (!isNew && id) {
      promoBlocksApi
        .get(id)
        .then((data) => {
          setForm({
            slug: data.slug ?? '',
            title: data.title ?? '',
            description: data.description ?? '',
            href: data.href ?? undefined,
            contentMode: (data as { contentMode?: string }).contentMode ?? 'LINK_ONLY',
            collectionId: (data as { collectionId?: string | null }).collectionId ?? null,
            selectionMode: data.selectionMode,
            contentType: data.contentType,
            citySlug: data.citySlug ?? '',
            categorySlug: data.categorySlug ?? '',
            tagSlugs: data.tagSlugs ?? [],
            iconSource: data.iconSource ?? 'LIBRARY',
            iconKey: data.iconKey ?? undefined,
            iconSvg: data.iconSvg ?? undefined,
            bgMode: data.bgMode ?? 'GRADIENT',
            bgColor: data.bgColor ?? undefined,
            gradientFrom: data.gradientFrom ?? undefined,
            gradientTo: data.gradientTo ?? undefined,
            startsAt: data.startsAt ?? undefined,
            endsAt: data.endsAt ?? undefined,
            priority: data.priority ?? 0,
            sortOrder: data.sortOrder ?? 0,
            isActive: data.isActive ?? true,
            targetCitySlugs: (data as { targetCitySlugs?: string[] }).targetCitySlugs ?? [],
          });
        })
        .catch(() => {
          setForm({
            slug: '',
            title: '',
            description: '',
            href: '',
            contentMode: 'LINK_ONLY',
            iconSource: 'LIBRARY',
            bgMode: 'GRADIENT',
            priority: 0,
            sortOrder: 0,
            isActive: true,
          });
        })
        .finally(() => setLoading(false));
    } else if (isNew) {
      setForm({
        slug: '',
        title: '',
        description: '',
        href: '',
        contentMode: 'LINK_ONLY',
        iconSource: 'LIBRARY',
        bgMode: 'GRADIENT',
        priority: 0,
        sortOrder: 0,
        isActive: true,
      });
      setLoading(false);
    }
  }, [id, isNew]);

  const handleSave = async () => {
    if (!form || !id || id === 'new') return;
    if (!form.slug.trim()) {
      toast.error('Slug обязателен');
      return;
    }
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
      await promoBlocksApi.update(id, form);
      toast.success('Сохранено');
      navigate('/promo-blocks');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
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
        <h1 className="text-2xl font-bold tracking-tight">Редактировать промо-блок</h1>
        <p className="text-muted-foreground">{form.title || form.slug}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Данные промо-блока</CardTitle>
          <CardDescription>Slug, название, ссылка, иконка и фон</CardDescription>
        </CardHeader>
        <CardContent>
          <PromoBlockForm form={form} onChange={(patch) => setForm((f) => (f ? { ...f, ...patch } : f))} collections={collections} />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/promo-blocks')}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
