import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Trash2, Plus, X } from 'lucide-react';
import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CATEGORIES = [
  { value: '', label: '— Без фильтра —' },
  { value: 'EXCURSION', label: 'Экскурсии' },
  { value: 'MUSEUM', label: 'Музеи и Арт' },
  { value: 'EVENT', label: 'Мероприятия' },
];

const AUDIENCES = [
  { value: '', label: '— Без фильтра —' },
  { value: 'ALL', label: 'Все' },
  { value: 'KIDS', label: 'Детям' },
  { value: 'FAMILY', label: 'Семейные' },
];

interface CollectionFormData {
  slug: string;
  title: string;
  subtitle: string;
  cityId: string;
  heroImage: string;
  description: string;
  filterTags: string[];
  filterCategory: string;
  filterSubcategory: string;
  filterAudience: string;
  additionalFilters: string; // JSON string
  pinnedEventIds: string[];
  excludedEventIds: string[];
  metaTitle: string;
  metaDescription: string;
  infoBlocks: Array<{ title: string; text: string }>;
  faq: Array<{ question: string; answer: string }>;
  isActive: boolean;
  sortOrder: number;
  version: number;
}

const defaultForm: CollectionFormData = {
  slug: '',
  title: '',
  subtitle: '',
  cityId: '',
  heroImage: '',
  description: '',
  filterTags: [],
  filterCategory: '',
  filterSubcategory: '',
  filterAudience: '',
  additionalFilters: '',
  pinnedEventIds: [],
  excludedEventIds: [],
  metaTitle: '',
  metaDescription: '',
  infoBlocks: [],
  faq: [],
  isActive: true,
  sortOrder: 0,
  version: 0,
};

interface CityOption {
  id: string;
  name: string;
  slug: string;
}

export function CollectionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState<CollectionFormData>({ ...defaultForm });
  const [cities, setCities] = useState<CityOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Для поиска событий (pinned/excluded)
  const [eventSearch, setEventSearch] = useState('');
  const [eventResults, setEventResults] = useState<any[]>([]);
  const [searchTarget, setSearchTarget] = useState<'pinned' | 'excluded'>('pinned');

  // Тег ввод
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    // Загрузка городов
    adminApi.get<{ items: CityOption[] }>('/admin/cities?limit=100').then((data) => {
      setCities(data.items ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    adminApi.get(`/admin/collections/${id}`).then((data: any) => {
      setForm({
        slug: data.slug || '',
        title: data.title || '',
        subtitle: data.subtitle || '',
        cityId: data.cityId || '',
        heroImage: data.heroImage || '',
        description: data.description || '',
        filterTags: data.filterTags || [],
        filterCategory: data.filterCategory || '',
        filterSubcategory: data.filterSubcategory || '',
        filterAudience: data.filterAudience || '',
        additionalFilters: data.additionalFilters ? JSON.stringify(data.additionalFilters, null, 2) : '',
        pinnedEventIds: data.pinnedEventIds || [],
        excludedEventIds: data.excludedEventIds || [],
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
        infoBlocks: Array.isArray(data.infoBlocks) ? data.infoBlocks : [],
        faq: Array.isArray(data.faq) ? data.faq : [],
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        version: data.version ?? 0,
      });
    }).catch((e: any) => setError(e.message));
  }, [id, isNew]);

  // Поиск событий для курации
  useEffect(() => {
    if (!eventSearch || eventSearch.length < 2) {
      setEventResults([]);
      return;
    }
    const timer = setTimeout(() => {
      adminApi
        .get<{ items: any[] }>(`/admin/events?search=${encodeURIComponent(eventSearch)}&limit=10`)
        .then((data) => setEventResults(data.items ?? []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [eventSearch]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let additionalFilters = undefined;
      if (form.additionalFilters.trim()) {
        try {
          additionalFilters = JSON.parse(form.additionalFilters);
        } catch {
          setError('additionalFilters: некорректный JSON');
          setSaving(false);
          return;
        }
      }

      const payload = {
        slug: form.slug,
        title: form.title,
        subtitle: form.subtitle || undefined,
        cityId: form.cityId || undefined,
        heroImage: form.heroImage || undefined,
        description: form.description || undefined,
        filterTags: form.filterTags.length > 0 ? form.filterTags : undefined,
        filterCategory: form.filterCategory || undefined,
        filterSubcategory: form.filterSubcategory || undefined,
        filterAudience: form.filterAudience || undefined,
        additionalFilters,
        pinnedEventIds: form.pinnedEventIds,
        excludedEventIds: form.excludedEventIds,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        infoBlocks: form.infoBlocks.length > 0 ? form.infoBlocks : undefined,
        faq: form.faq.length > 0 ? form.faq : undefined,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
        ...(isNew ? {} : { version: form.version }),
      };

      if (isNew) {
        const result = await adminApi.post<any>('/admin/collections', payload);
        setSuccess('Подборка создана');
        navigate(`/collections/${result.id}`, { replace: true });
      } else {
        const result = await adminApi.patch<any>(`/admin/collections/${id}`, payload);
        setForm((prev) => ({ ...prev, version: result.version }));
        setSuccess('Подборка сохранена');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить подборку?')) return;
    try {
      await adminApi.delete(`/admin/collections/${id}`);
      navigate('/collections', { replace: true });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.filterTags.includes(t)) {
      setForm((prev) => ({ ...prev, filterTags: [...prev.filterTags, t] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, filterTags: prev.filterTags.filter((t) => t !== tag) }));
  };

  const addEvent = (eventId: string) => {
    const key = searchTarget === 'pinned' ? 'pinnedEventIds' : 'excludedEventIds';
    if (!form[key].includes(eventId)) {
      setForm((prev) => ({ ...prev, [key]: [...prev[key], eventId] }));
    }
    setEventSearch('');
    setEventResults([]);
  };

  const removeEvent = (key: 'pinnedEventIds' | 'excludedEventIds', eventId: string) => {
    setForm((prev) => ({ ...prev, [key]: prev[key].filter((id) => id !== eventId) }));
  };

  const addInfoBlock = () => {
    setForm((prev) => ({ ...prev, infoBlocks: [...prev.infoBlocks, { title: '', text: '' }] }));
  };

  const updateInfoBlock = (index: number, field: 'title' | 'text', value: string) => {
    setForm((prev) => {
      const blocks = [...prev.infoBlocks];
      blocks[index] = { ...blocks[index], [field]: value };
      return { ...prev, infoBlocks: blocks };
    });
  };

  const removeInfoBlock = (index: number) => {
    setForm((prev) => ({ ...prev, infoBlocks: prev.infoBlocks.filter((_, i) => i !== index) }));
  };

  const addFaq = () => {
    setForm((prev) => ({ ...prev, faq: [...prev.faq, { question: '', answer: '' }] }));
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    setForm((prev) => {
      const items = [...prev.faq];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, faq: items };
    });
  };

  const removeFaq = (index: number) => {
    setForm((prev) => ({ ...prev, faq: prev.faq.filter((_, i) => i !== index) }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/collections')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isNew ? 'Новая подборка' : form.title || 'Подборка'}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? 'Создание тематической подборки' : `Slug: ${form.slug}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!isNew && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Удалить
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}
      {success && (
        <Card className="border-green-500">
          <CardContent className="py-3 text-sm text-green-700">{success}</CardContent>
        </Card>
      )}

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Основное</TabsTrigger>
          <TabsTrigger value="filters">Фильтры</TabsTrigger>
          <TabsTrigger value="curation">Курация</TabsTrigger>
          <TabsTrigger value="content">Контент</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* ── Основное ── */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                    placeholder="nochnye-ekskursii-spb"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Заголовок (H1) *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Ночные экскурсии Петербурга"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Подзаголовок</Label>
                <Input
                  value={form.subtitle}
                  onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                  placeholder="Лучшие ночные прогулки по городу"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Город</Label>
                  <Select
                    value={form.cityId || '__none__'}
                    onValueChange={(v) => setForm((p) => ({ ...p, cityId: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Кросс-городская" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Кросс-городская —</SelectItem>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Порядок сортировки</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hero-изображение (URL)</Label>
                <Input
                  value={form.heroImage}
                  onChange={(e) => setForm((p) => ({ ...p, heroImage: e.target.value }))}
                  placeholder="https://..."
                />
                {form.heroImage && (
                  <img src={form.heroImage} alt="Hero preview" className="mt-2 h-32 w-full rounded-lg object-cover" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4"
                  id="isActive"
                />
                <Label htmlFor="isActive">Активна (видна на сайте)</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Фильтры ── */}
        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Динамические фильтры</CardTitle>
              <CardDescription>
                Определяют, какие события автоматически попадают в подборку
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Категория</Label>
                  <Select
                    value={form.filterCategory || ''}
                    onValueChange={(v) => setForm((p) => ({ ...p, filterCategory: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value || '__none__'}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Аудитория</Label>
                  <Select
                    value={form.filterAudience || ''}
                    onValueChange={(v) => setForm((p) => ({ ...p, filterAudience: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map((a) => (
                        <SelectItem key={a.value} value={a.value || '__none__'}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Подкатегория</Label>
                <Input
                  value={form.filterSubcategory}
                  onChange={(e) => setForm((p) => ({ ...p, filterSubcategory: e.target.value }))}
                  placeholder="WALKING, RIVER, CONCERT..."
                />
              </div>

              <div className="space-y-2">
                <Label>Теги (slug, OR-логика)</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="night, romantic, family..."
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {form.filterTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {form.filterTags.map((t) => (
                      <Badge key={t} variant="secondary" className="gap-1">
                        {t}
                        <button onClick={() => removeTag(t)} className="ml-0.5 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Дополнительные фильтры (JSON)</Label>
                <Textarea
                  value={form.additionalFilters}
                  onChange={(e) => setForm((p) => ({ ...p, additionalFilters: e.target.value }))}
                  placeholder='{"maxDuration": 120, "dateMode": "OPEN_DATE"}'
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Курация ── */}
        <TabsContent value="curation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Закреплённые события (pinned)</CardTitle>
              <CardDescription>
                Всегда отображаются первыми в подборке в указанном порядке
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.pinnedEventIds.length > 0 && (
                <div className="space-y-1">
                  {form.pinnedEventIds.map((eid, i) => (
                    <div key={eid} className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
                      <span className="text-muted-foreground">#{i + 1}</span>
                      <code className="flex-1 text-xs">{eid}</code>
                      <button onClick={() => removeEvent('pinnedEventIds', eid)} className="text-destructive hover:text-destructive/80">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={searchTarget === 'pinned' ? eventSearch : ''}
                  onChange={(e) => { setSearchTarget('pinned'); setEventSearch(e.target.value); }}
                  placeholder="Поиск события по названию..."
                  onFocus={() => setSearchTarget('pinned')}
                />
              </div>
              {searchTarget === 'pinned' && eventResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {eventResults.map((ev: any) => (
                    <button
                      key={ev.id}
                      onClick={() => addEvent(ev.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="font-medium">{ev.title}</span>
                      <span className="text-xs text-muted-foreground">{ev.city?.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Исключённые события (excluded)</CardTitle>
              <CardDescription>
                Никогда не попадут в подборку, даже если соответствуют фильтрам
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.excludedEventIds.length > 0 && (
                <div className="space-y-1">
                  {form.excludedEventIds.map((eid) => (
                    <div key={eid} className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
                      <code className="flex-1 text-xs">{eid}</code>
                      <button onClick={() => removeEvent('excludedEventIds', eid)} className="text-destructive hover:text-destructive/80">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={searchTarget === 'excluded' ? eventSearch : ''}
                  onChange={(e) => { setSearchTarget('excluded'); setEventSearch(e.target.value); }}
                  placeholder="Поиск события по названию..."
                  onFocus={() => setSearchTarget('excluded')}
                />
              </div>
              {searchTarget === 'excluded' && eventResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {eventResults.map((ev: any) => (
                    <button
                      key={ev.id}
                      onClick={() => addEvent(ev.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="font-medium">{ev.title}</span>
                      <span className="text-xs text-muted-foreground">{ev.city?.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Контент ── */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Описание (SEO-текст)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Markdown-текст, который будет отображён на странице подборки..."
                rows={6}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Информационные блоки</CardTitle>
                <CardDescription>Редакционные секции с дополнительной информацией</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addInfoBlock}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить блок
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.infoBlocks.map((block, i) => (
                <div key={i} className="relative rounded-md border p-4 space-y-2">
                  <button
                    onClick={() => removeInfoBlock(i)}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <Input
                    value={block.title}
                    onChange={(e) => updateInfoBlock(i, 'title', e.target.value)}
                    placeholder="Заголовок блока"
                    className="font-medium"
                  />
                  <Textarea
                    value={block.text}
                    onChange={(e) => updateInfoBlock(i, 'text', e.target.value)}
                    placeholder="Текст блока"
                    rows={3}
                  />
                </div>
              ))}
              {form.infoBlocks.length === 0 && (
                <p className="text-sm text-muted-foreground">Нет блоков</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">FAQ</CardTitle>
                <CardDescription>Часто задаваемые вопросы (аккордеон на странице)</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addFaq}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить вопрос
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.faq.map((item, i) => (
                <div key={i} className="relative rounded-md border p-4 space-y-2">
                  <button
                    onClick={() => removeFaq(i)}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <Input
                    value={item.question}
                    onChange={(e) => updateFaq(i, 'question', e.target.value)}
                    placeholder="Вопрос"
                    className="font-medium"
                  />
                  <Textarea
                    value={item.answer}
                    onChange={(e) => updateFaq(i, 'answer', e.target.value)}
                    placeholder="Ответ"
                    rows={2}
                  />
                </div>
              ))}
              {form.faq.length === 0 && (
                <p className="text-sm text-muted-foreground">Нет вопросов</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SEO ── */}
        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO метаданные</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Meta Title</Label>
                <Input
                  value={form.metaTitle}
                  onChange={(e) => setForm((p) => ({ ...p, metaTitle: e.target.value }))}
                  placeholder="Ночные экскурсии Петербурга — билеты онлайн | Дайбилет"
                />
                <p className="text-xs text-muted-foreground">
                  {form.metaTitle.length}/60 символов
                </p>
              </div>
              <div className="space-y-2">
                <Label>Meta Description</Label>
                <Textarea
                  value={form.metaDescription}
                  onChange={(e) => setForm((p) => ({ ...p, metaDescription: e.target.value }))}
                  placeholder="Лучшие ночные экскурсии по Санкт-Петербургу: водные прогулки, развод мостов, ночные музеи. Купить билеты онлайн."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {form.metaDescription.length}/160 символов
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
