import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import {
  promoCollectionsApi,
  type PromoCollection,
  type PromoCollectionFormData,
  type PromoCollectionItem,
  type PromoCollectionRuleFormData,
} from '@/api/promo-collections';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const SORT_MODES = [
  { value: 'POPULAR', label: 'По популярности' },
  { value: 'RATING', label: 'По рейтингу' },
  { value: 'SOONEST', label: 'Ближайшие' },
  { value: 'RANDOM', label: 'Случайно' },
];

export function PromoCollectionEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [collection, setCollection] = useState<PromoCollection | null>(null);
  const [form, setForm] = useState<PromoCollectionFormData | null>(null);
  const [ruleForm, setRuleForm] = useState<PromoCollectionRuleFormData | null>(null);
  const [items, setItems] = useState<PromoCollectionItem[]>([]);
  const [preview, setPreview] = useState<{ id: string; slug: string; title: string }[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Add item: search
  const [eventSearch, setEventSearch] = useState('');
  const [venueSearch, setVenueSearch] = useState('');
  const [eventResults, setEventResults] = useState<{ id: string; slug: string; title: string }[]>([]);
  const [venueResults, setVenueResults] = useState<{ id: string; slug: string; title: string }[]>([]);

  useEffect(() => {
    if (isNew) {
      setForm({
        slug: '',
        title: '',
        description: '',
        selectionMode: 'MANUAL',
        contentType: 'EVENTS',
        isActive: true,
      });
      setRuleForm({ sortMode: 'POPULAR', limit: 12, onlyActive: true, onlyBookable: true });
      setLoading(false);
      return;
    }
    if (!id) return;
    setLoading(true);
    Promise.all([
      promoCollectionsApi.get(id),
      promoCollectionsApi.getRule(id).catch(() => null),
    ])
      .then(([col, rule]) => {
        setCollection(col);
        setForm({
          slug: col.slug,
          title: col.title,
          description: col.description ?? '',
          selectionMode: col.selectionMode,
          contentType: col.contentType,
          isActive: col.isActive,
        });
        setRuleForm(
          rule
            ? {
                citySlug: rule.citySlug,
                categorySlug: rule.categorySlug,
                tagSlugs: rule.tagSlugs,
                isKids: rule.isKids,
                isIndoor: rule.isIndoor,
                sortMode: rule.sortMode,
                limit: rule.limit,
                onlyActive: rule.onlyActive,
                onlyBookable: rule.onlyBookable,
              }
            : { sortMode: 'POPULAR', limit: 12, onlyActive: true, onlyBookable: true },
        );
        setItems(col.items ?? []);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
        navigate('/promo-collections');
      })
      .finally(() => setLoading(false));
  }, [id, isNew, navigate]);

  useEffect(() => {
    if (!eventSearch || eventSearch.length < 2) {
      setEventResults([]);
      return;
    }
    const t = setTimeout(() => {
      adminApi
        .get<{ items: { id: string; slug: string; title: string }[] }>(
          `/admin/events?search=${encodeURIComponent(eventSearch)}&limit=10`,
        )
        .then((d) => setEventResults(d.items ?? []))
        .catch(() => setEventResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [eventSearch]);

  useEffect(() => {
    if (!venueSearch || venueSearch.length < 2) {
      setVenueResults([]);
      return;
    }
    const t = setTimeout(() => {
      adminApi
        .get<{ items: { id: string; slug: string; title: string }[] }>(
          `/admin/venues?search=${encodeURIComponent(venueSearch)}&limit=10`,
        )
        .then((d) => setVenueResults(d.items ?? []))
        .catch(() => setVenueResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [venueSearch]);

  const loadPreview = () => {
    if (!id || id === 'new') return;
    setPreviewLoading(true);
    promoCollectionsApi
      .preview(id)
      .then(setPreview)
      .catch(() => toast.error('Ошибка preview'))
      .finally(() => setPreviewLoading(false));
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.slug.trim() || !form.title.trim()) {
      toast.error('Slug и название обязательны');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const created = await promoCollectionsApi.create(form);
        toast.success('Коллекция создана');
        navigate(`/promo-collections/${created.id}`, { replace: true });
      } else if (id) {
        await promoCollectionsApi.update(id, form);
        setCollection((c) => (c ? { ...c, ...form } : null));
        toast.success('Сохранено');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRule = async () => {
    if (!id || id === 'new' || !ruleForm || collection?.selectionMode !== 'AUTO') return;
    setSaving(true);
    try {
      await promoCollectionsApi.upsertRule(id, ruleForm);
      toast.success('Правила сохранены');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEvent = async (eventId: string) => {
    if (!id || id === 'new') return;
    try {
      const added = await promoCollectionsApi.addItem(id, {
        itemType: 'EVENT',
        eventId,
      });
      setItems((prev) => [...prev, added]);
      setEventSearch('');
      setEventResults([]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleAddVenue = async (venueId: string) => {
    if (!id || id === 'new') return;
    try {
      const added = await promoCollectionsApi.addItem(id, {
        itemType: 'VENUE',
        venueId,
      });
      setItems((prev) => [...prev, added]);
      setVenueSearch('');
      setVenueResults([]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!id || id === 'new') return;
    try {
      await promoCollectionsApi.removeItem(id, itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loading || !form) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const isManual = form.selectionMode === 'MANUAL';
  const isEvents = form.contentType === 'EVENTS';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={isNew ? 'Новая promo-коллекция' : collection?.title ?? 'Редактирование'}
        subtitle="Подборка событий или мест для промо-блока"
      />

      <Card>
        <CardHeader>
          <CardTitle>Основные</CardTitle>
          <CardDescription>Slug, название, режим наполнения</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Slug (kebab-case)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => (f ? { ...f, slug: e.target.value } : f))}
                placeholder="best-excursions"
                disabled={!isNew}
              />
            </div>
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => (f ? { ...f, title: e.target.value } : f))}
                placeholder="Лучшие экскурсии"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Input
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
              placeholder="Краткое описание"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Режим</Label>
              <Select
                value={form.selectionMode}
                onValueChange={(v) =>
                  setForm((f) => (f ? { ...f, selectionMode: v as 'MANUAL' | 'AUTO' } : f))
                }
                disabled={!isNew}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Вручную</SelectItem>
                  <SelectItem value="AUTO">Автоматически</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Контент</Label>
              <Select
                value={form.contentType}
                onValueChange={(v) =>
                  setForm((f) => (f ? { ...f, contentType: v as 'EVENTS' | 'VENUES' } : f))
                }
                disabled={!isNew}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EVENTS">События</SelectItem>
                  <SelectItem value="VENUES">Места</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm((f) => (f ? { ...f, isActive: e.target.checked } : f))}
            />
            <Label htmlFor="isActive">Активна</Label>
          </div>
        </CardContent>
      </Card>

      {!isNew && isManual && (
        <Card>
          <CardHeader>
            <CardTitle>Элементы ({items.length})</CardTitle>
            <CardDescription>
              {isEvents ? 'Добавьте события в подборку' : 'Добавьте места в подборку'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Поиск и добавление</Label>
              {isEvents ? (
                <div className="relative flex flex-col gap-2">
                  <Input
                    placeholder="Поиск событий (минимум 2 символа)..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    className="flex-1"
                  />
                  {eventResults.length > 0 && (
                    <div className="absolute top-full left-0 z-10 mt-1 max-h-48 w-full overflow-auto rounded border bg-popover p-1">
                      {eventResults.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => handleAddEvent(ev.id)}
                        >
                          {ev.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative flex flex-col gap-2">
                  <Input
                    placeholder="Поиск мест (минимум 2 символа)..."
                    value={venueSearch}
                    onChange={(e) => setVenueSearch(e.target.value)}
                    className="flex-1"
                  />
                  {venueResults.length > 0 && (
                    <div className="absolute top-full left-0 z-10 mt-1 max-h-48 w-full overflow-auto rounded border bg-popover p-1">
                      {venueResults.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => handleAddVenue(v.id)}
                        >
                          {v.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Пока нет элементов</p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded border px-3 py-2"
                  >
                    <span className="text-sm">
                      {item.event?.title ?? item.venue?.title ?? item.id}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isNew && form.selectionMode === 'AUTO' && ruleForm && (
        <Card>
          <CardHeader>
            <CardTitle>Правила авто-подборки</CardTitle>
            <CardDescription>Фильтры и сортировка</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Город (slug)</Label>
                <Input
                  value={ruleForm.citySlug ?? ''}
                  onChange={(e) =>
                    setRuleForm((r) => (r ? { ...r, citySlug: e.target.value || null } : r))
                  }
                  placeholder="spb"
                />
              </div>
              <div className="space-y-2">
                <Label>Категория</Label>
                <Input
                  value={ruleForm.categorySlug ?? ''}
                  onChange={(e) =>
                    setRuleForm((r) => (r ? { ...r, categorySlug: e.target.value || null } : r))
                  }
                  placeholder="EXCURSION"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Лимит</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={ruleForm.limit ?? 12}
                  onChange={(e) =>
                    setRuleForm((r) => (r ? { ...r, limit: Number(e.target.value) || 12 } : r))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Сортировка</Label>
                <Select
                  value={ruleForm.sortMode ?? 'POPULAR'}
                  onValueChange={(v) =>
                    setRuleForm((r) => (r ? { ...r, sortMode: v as typeof ruleForm.sortMode } : r))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_MODES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ruleForm.onlyActive ?? true}
                  onChange={(e) =>
                    setRuleForm((r) => (r ? { ...r, onlyActive: e.target.checked } : r))
                  }
                />
                <span className="text-sm">Только активные</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ruleForm.onlyBookable ?? true}
                  onChange={(e) =>
                    setRuleForm((r) => (r ? { ...r, onlyBookable: e.target.checked } : r))
                  }
                />
                <span className="text-sm">Только с бронированием</span>
              </label>
            </div>
            <Button onClick={handleSaveRule} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Сохранить правила
            </Button>
          </CardContent>
        </Card>
      )}

      {!isNew && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription>Что попадёт в подборку</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadPreview} disabled={previewLoading}>
                {previewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Обновить</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {preview.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Нажмите «Обновить», чтобы загрузить preview
              </p>
            ) : (
              <div className="space-y-1">
                {preview.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded border px-2 py-1">
                    <Badge variant="secondary">{p.slug}</Badge>
                    <span className="text-sm">{p.title}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isNew ? 'Создать' : 'Сохранить'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/promo-collections')}>
          {isNew ? 'Отмена' : 'К списку'}
        </Button>
      </div>
    </div>
  );
}
