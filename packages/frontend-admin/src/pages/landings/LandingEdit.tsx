import { ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { PageHeader } from '@daibilet/shared-ui';

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
import {
  type LandingBlock,
  type LandingBlockType,
  blocksToLegacyPayload,
  createEmptyBlock,
  jsonToBlocksMigration,
  validateBlocks,
} from './landing-content';

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
  collectionId: string;
  selectionMode: 'CUSTOM' | 'COLLECTION';
  templateType: 'GENERIC_CARDS' | 'COMPARISON_TABLE' | 'HYBRID' | 'SEASONAL_EVENT';
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  showInCollections: boolean;
  isIndexable: boolean;
  title: string;
  subtitle: string;
  heroText: string;
  metaTitle: string;
  metaDescription: string;
  legalText: string;
  isActive: boolean;
  sortOrder: number;
  rankingPreset: 'balanced' | 'popularity' | 'availability';
}

const EMPTY_FORM: LandingForm = {
  slug: '',
  cityId: '',
  filterTag: '',
  collectionId: '',
  selectionMode: 'CUSTOM',
  templateType: 'GENERIC_CARDS',
  status: 'DRAFT',
  showInCollections: false,
  isIndexable: true,
  title: '',
  subtitle: '',
  heroText: '',
  metaTitle: '',
  metaDescription: '',
  legalText: '',
  isActive: true,
  sortOrder: 0,
  rankingPreset: 'balanced',
};

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
  const [blocks, setBlocks] = useState<LandingBlock[]>([]);
  const [newBlockType, setNewBlockType] = useState<LandingBlockType>('FAQ');

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
          collectionId: (data.collectionId as string) ?? '',
          selectionMode: ((data.selectionMode as 'CUSTOM' | 'COLLECTION') ?? 'CUSTOM'),
          templateType: ((data.templateType as LandingForm['templateType']) ?? 'GENERIC_CARDS'),
          status: ((data.status as LandingForm['status']) ?? 'DRAFT'),
          showInCollections: (data.showInCollections as boolean) ?? false,
          isIndexable: (data.isIndexable as boolean) ?? true,
          title: (data.title as string) ?? '',
          subtitle: (data.subtitle as string) ?? '',
          heroText: (data.heroText as string) ?? '',
          metaTitle: (data.metaTitle as string) ?? '',
          metaDescription: (data.metaDescription as string) ?? '',
          legalText: (data.legalText as string) ?? '',
          isActive: (data.isActive as boolean) ?? true,
          sortOrder: (data.sortOrder as number) ?? 0,
          rankingPreset: (
            (data.rankingJson as { preset?: LandingForm['rankingPreset'] } | null | undefined)?.preset ??
            'balanced'
          ) as LandingForm['rankingPreset'],
        });
        setBlocks(
          jsonToBlocksMigration({
            faq: data.faq,
            infoBlocks: data.infoBlocks,
            reviews: data.reviews,
            stats: data.stats,
            relatedLinks: data.relatedLinks,
            additionalFilters: data.additionalFilters,
            howToChoose: data.howToChoose,
          }),
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id, isCreate]);

  const orderedBlocks = useMemo(() => [...blocks].sort((a, b) => a.order - b.order), [blocks]);

  const reindex = (next: LandingBlock[]) => next.map((block, index) => ({ ...block, order: index }));
  const setOrderedBlocks = (next: LandingBlock[]) => setBlocks(reindex(next));

  const moveBlock = (idToMove: string, direction: -1 | 1) => {
    const current = [...orderedBlocks];
    const index = current.findIndex((b) => b.id === idToMove);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return;
    const [item] = current.splice(index, 1);
    current.splice(target, 0, item);
    setOrderedBlocks(current);
  };

  const updateBlock = (idToUpdate: string, next: LandingBlock) =>
    setBlocks((prev) => prev.map((block) => (block.id === idToUpdate ? next : block)));

  const buildPayload = () => {
    const validationErrors = validateBlocks(orderedBlocks);
    if (validationErrors.length) throw new Error(validationErrors.join('; '));
    const payload: Record<string, unknown> = {
      slug: form.slug,
      cityId: form.cityId,
      filterTag: form.filterTag,
      collectionId: form.collectionId || null,
      selectionMode: form.selectionMode,
      templateType: form.templateType,
      status: form.status,
      showInCollections: form.showInCollections,
      isIndexable: form.isIndexable,
      title: form.title,
      subtitle: form.subtitle || null,
      heroText: form.heroText || null,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      legalText: form.legalText || null,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
      rankingJson: { preset: form.rankingPreset },
    };
    Object.assign(payload, blocksToLegacyPayload(orderedBlocks));
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
        await adminApi.patch(`/admin/landings/${id}`, buildPayload());
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
      <PageHeader
        title={isCreate ? 'Новый лендинг' : 'Редактирование лендинга'}
        subtitle={isCreate ? 'Создайте новый лендинг для города и тега' : 'Изменения сохранятся при нажатии «Сохранить»'}
        actions={
          <Button variant="outline" onClick={() => navigate('/landings')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
        }
      />

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
                <Label>Selection mode</Label>
                <Select value={form.selectionMode} onValueChange={(v) => setForm((f) => ({ ...f, selectionMode: v as LandingForm['selectionMode'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOM">CUSTOM</SelectItem>
                    <SelectItem value="COLLECTION">COLLECTION</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Collection ID (optional)</Label>
                <Input value={form.collectionId} onChange={(e) => setForm((f) => ({ ...f, collectionId: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={form.templateType} onValueChange={(v) => setForm((f) => ({ ...f, templateType: v as LandingForm['templateType'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERIC_CARDS">GENERIC_CARDS</SelectItem>
                    <SelectItem value="COMPARISON_TABLE">COMPARISON_TABLE</SelectItem>
                    <SelectItem value="HYBRID">HYBRID</SelectItem>
                    <SelectItem value="SEASONAL_EVENT">SEASONAL_EVENT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as LandingForm['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ranking preset</Label>
                <Select
                  value={form.rankingPreset}
                  onValueChange={(v) => setForm((f) => ({ ...f, rankingPreset: v as LandingForm['rankingPreset'] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">balanced</SelectItem>
                    <SelectItem value="popularity">popularity</SelectItem>
                    <SelectItem value="availability">availability</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.showInCollections} onChange={(e) => setForm((f) => ({ ...f, showInCollections: e.target.checked }))} className={cn('h-4 w-4 rounded border-input accent-primary')} />
                <Label className="font-normal">Показывать в подборках</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.isIndexable} onChange={(e) => setForm((f) => ({ ...f, isIndexable: e.target.checked }))} className={cn('h-4 w-4 rounded border-input accent-primary')} />
                <Label className="font-normal">Indexable</Label>
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

        {/* Typed content blocks */}
        <Card>
          <CardHeader>
            <CardTitle>Контентные блоки</CardTitle>
            <CardDescription>
              Form-based редактор без JSON textarea. Порядок влияет на рендер.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-2">
                <Label>Тип блока</Label>
                <Select value={newBlockType} onValueChange={(v) => setNewBlockType(v as LandingBlockType)}>
                  <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FAQ">FAQ</SelectItem>
                    <SelectItem value="INFO_CARDS">INFO_CARDS</SelectItem>
                    <SelectItem value="COMPARISON">COMPARISON</SelectItem>
                    <SelectItem value="CTA">CTA</SelectItem>
                    <SelectItem value="REVIEWS">REVIEWS</SelectItem>
                    <SelectItem value="STATS">STATS</SelectItem>
                    <SelectItem value="LINKS">LINKS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" className="gap-2" onClick={() => setOrderedBlocks([...orderedBlocks, createEmptyBlock(newBlockType, orderedBlocks.length)])}>
                <Plus className="h-4 w-4" />
                Добавить блок
              </Button>
            </div>
            {orderedBlocks.length === 0 && <p className="text-sm text-muted-foreground">Добавь хотя бы один контентный блок.</p>}
            <div className="space-y-3">
              {orderedBlocks.map((block) => (
                <Card key={block.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">{block.type}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button type="button" size="icon" variant="ghost" onClick={() => moveBlock(block.id, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => moveBlock(block.id, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => setOrderedBlocks(orderedBlocks.filter((it) => it.id !== block.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {block.type === 'FAQ' && (
                      <div className="space-y-2">
                        <Input
                          placeholder="Question"
                          value={block.payload[0]?.question ?? ''}
                          onChange={(e) =>
                            updateBlock(block.id, { ...block, payload: [{ question: e.target.value, answer: block.payload[0]?.answer ?? '' }] })
                          }
                        />
                        <Textarea
                          placeholder="Answer"
                          value={block.payload[0]?.answer ?? ''}
                          onChange={(e) =>
                            updateBlock(block.id, { ...block, payload: [{ question: block.payload[0]?.question ?? '', answer: e.target.value }] })
                          }
                          rows={3}
                        />
                      </div>
                    )}
                    {block.type === 'CTA' && (
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Input placeholder="Title" value={block.payload.title ?? ''} onChange={(e) => updateBlock(block.id, { ...block, payload: { ...block.payload, title: e.target.value } })} />
                        <Input placeholder="Button text" value={block.payload.buttonText ?? ''} onChange={(e) => updateBlock(block.id, { ...block, payload: { ...block.payload, buttonText: e.target.value } })} />
                        <Input placeholder="Link" value={block.payload.link ?? ''} onChange={(e) => updateBlock(block.id, { ...block, payload: { ...block.payload, link: e.target.value } })} />
                      </div>
                    )}
                    {block.type === 'INFO_CARDS' && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input placeholder="Title" value={block.payload[0]?.title ?? ''} onChange={(e) => updateBlock(block.id, { ...block, payload: [{ title: e.target.value, text: block.payload[0]?.text ?? '' }] })} />
                        <Input placeholder="Text" value={block.payload[0]?.text ?? ''} onChange={(e) => updateBlock(block.id, { ...block, payload: [{ title: block.payload[0]?.title ?? '', text: e.target.value }] })} />
                      </div>
                    )}
                    {block.type === 'REVIEWS' && (
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Input placeholder="Author" value={block.payload[0]?.author ?? ''} onChange={(e) => updateBlock(block.id, { ...block, payload: [{ ...block.payload[0], author: e.target.value, text: block.payload[0]?.text ?? '', rating: block.payload[0]?.rating ?? 5 }] })} />
                        <Input placeholder="Review text" value={block.payload[0]?.text ?? ''} onChange={(e) => updateBlock(block.id, { ...block, payload: [{ ...block.payload[0], text: e.target.value, author: block.payload[0]?.author ?? '', rating: block.payload[0]?.rating ?? 5 }] })} />
                        <Input type="number" placeholder="Rating" value={block.payload[0]?.rating ?? 5} onChange={(e) => updateBlock(block.id, { ...block, payload: [{ ...block.payload[0], rating: parseInt(e.target.value, 10) || 5, text: block.payload[0]?.text ?? '', author: block.payload[0]?.author ?? '' }] })} />
                      </div>
                    )}
                    {block.type === 'STATS' && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input type="number" placeholder="Sold tickets" value={block.payload.soldTickets ?? 0} onChange={(e) => updateBlock(block.id, { ...block, payload: { ...block.payload, soldTickets: parseInt(e.target.value, 10) || 0 } })} />
                        <Input type="number" placeholder="Avg rating" value={block.payload.avgRating ?? 5} onChange={(e) => updateBlock(block.id, { ...block, payload: { ...block.payload, avgRating: parseFloat(e.target.value) || 0 } })} />
                      </div>
                    )}
                    {block.type === 'LINKS' && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input placeholder="Title" value={block.payload[0]?.title ?? ''} onChange={(e) => updateBlock(block.id, { ...block, payload: [{ title: e.target.value, href: block.payload[0]?.href ?? '' }] })} />
                        <Input placeholder="Href" value={block.payload[0]?.href ?? ''} onChange={(e) => updateBlock(block.id, { ...block, payload: [{ title: block.payload[0]?.title ?? '', href: e.target.value }] })} />
                      </div>
                    )}
                    {block.type === 'COMPARISON' && (
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Input placeholder="Columns (comma-separated)" value={block.payload.columns.join(', ')} onChange={(e) => updateBlock(block.id, { ...block, payload: { ...block.payload, columns: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } })} />
                        <Input type="number" placeholder="Max rows" value={block.payload.maxRows ?? 10} onChange={(e) => updateBlock(block.id, { ...block, payload: { ...block.payload, maxRows: parseInt(e.target.value, 10) || 10 } })} />
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={Boolean(block.payload.hideIncomparable)} onChange={(e) => updateBlock(block.id, { ...block, payload: { ...block.payload, hideIncomparable: e.target.checked } })} className={cn('h-4 w-4 rounded border-input accent-primary')} />
                          Hide incomparable
                        </label>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
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
