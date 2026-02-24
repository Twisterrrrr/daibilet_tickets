import { ArrowLeft, Copy, ExternalLink, Eye, EyeOff, Pencil, Plus, RotateCcw, Save, Star, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { adminApi } from '@/api/client';
import { SeoMetaEditor } from '@/components/SeoMetaEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import { EventTemplateFields } from './EventTemplateFields';

// ─── Types ───────────────────────────────────────────────────────────────────

type EventCategory = 'EXCURSION' | 'MUSEUM' | 'EVENT';
type EventSubcategory = string;

const CATEGORY_OPTIONS = [
  { value: 'EXCURSION', label: 'Экскурсии' },
  { value: 'MUSEUM', label: 'Музеи и Арт' },
  { value: 'EVENT', label: 'Мероприятия' },
];

const SUBCATEGORY_OPTIONS: Record<string, { value: string; label: string }[]> = {
  EXCURSION: [
    { value: 'RIVER', label: 'Речная' },
    { value: 'WALKING', label: 'Пешеходная' },
    { value: 'BUS', label: 'Автобусная' },
    { value: 'COMBINED', label: 'Комбинированная' },
    { value: 'QUEST', label: 'Квест' },
    { value: 'GASTRO', label: 'Гастро' },
    { value: 'ROOFTOP', label: 'Крыши' },
  ],
  MUSEUM: [
    { value: 'MUSEUM_CLASSIC', label: 'Музей' },
    { value: 'EXHIBITION', label: 'Выставка' },
    { value: 'GALLERY', label: 'Галерея' },
    { value: 'PALACE', label: 'Дворец' },
    { value: 'PARK', label: 'Парк' },
    { value: 'ART_SPACE', label: 'Арт-пространство' },
    { value: 'SCULPTURE', label: 'Скульптура' },
    { value: 'CONTEMPORARY', label: 'Совр. искусство' },
  ],
  EVENT: [
    { value: 'CONCERT', label: 'Концерт' },
    { value: 'SHOW', label: 'Шоу' },
    { value: 'STANDUP', label: 'Стендап' },
    { value: 'THEATER', label: 'Театр' },
    { value: 'SPORT', label: 'Спорт' },
    { value: 'FESTIVAL', label: 'Фестиваль' },
    { value: 'MASTERCLASS', label: 'Мастер-класс' },
    { value: 'PARTY', label: 'Вечеринка' },
  ],
};

interface Session {
  id: string;
  startsAt: string;
  availableTickets: number;
  prices?: { min?: number; max?: number } | number[];
}

interface EventOffer {
  id: string;
  source: string;
  purchaseType: string;
  externalEventId: string | null;
  metaEventId: string | null;
  deeplink: string | null;
  priceFrom: number | null;
  commissionPercent: number | null;
  status: 'ACTIVE' | 'HIDDEN' | 'DISABLED';
  isPrimary: boolean;
  priority: number;
  availabilityMode: string | null;
  badge: string | null;
  operatorId: string | null;
  operator?: { id: string; name: string; slug: string } | null;
  _count?: { sessions?: number };
}

interface OperatorOption {
  id: string;
  name: string;
  slug: string;
}

const PURCHASE_TYPE_LABELS: Record<string, string> = {
  WIDGET: 'Виджет (TC и др.)',
  REDIRECT: 'Внешняя ссылка',
  REQUEST: 'Заявка',
};

const AVAILABILITY_LABELS: Record<string, string> = {
  UNKNOWN: 'Неизвестно',
  LIMITED: 'Ограничено',
  SOLD_OUT: 'Распродано',
  BY_API: 'По API',
};

const BADGE_OPTIONS = [
  { value: '', label: 'Без бейджа' },
  { value: 'optimal', label: 'Оптимальный' },
  { value: 'cheapest', label: 'Дешевле' },
  { value: 'fastest', label: 'Быстрее' },
];

interface EventOverride {
  id: string;
  isHidden: boolean;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  category?: EventCategory | null;
  audience?: string | null;
  subcategories?: EventSubcategory[];
  minAge?: number | null;
  manualRating?: number | null;
  templateData?: Record<string, unknown> | null;
}

interface VenueOption {
  id: string;
  title: string;
  slug: string;
  venueType: string;
}

interface EventDetail {
  id: string;
  title: string;
  category: EventCategory;
  source: string;
  isActive: boolean;
  imageUrl: string | null;
  subcategories: EventSubcategory[];
  rating: number | null;
  reviewCount: number;
  externalRating: number | null;
  externalReviewCount: number | null;
  externalSource: string | null;
  address: string | null;
  description: string | null;
  shortDescription: string | null;
  minAge: number | null;
  venueId: string | null;
  dateMode: string;
  isPermanent: boolean;
  endDate: string | null;
  sessions?: Session[];
  tags?: { tag: { id: string; name: string } }[];
  offers?: EventOffer[];
  override?: EventOverride | null;
}

const SOURCE_LABELS: Record<string, string> = {
  TC: 'TicketsCloud',
  TEPLOHOD: 'Теплоход',
  RADARIO: 'Radario',
  TIMEPAD: 'TimePad',
  MANUAL: 'Ручной',
};

function formatPrice(kopecks: number | null): string {
  if (!kopecks) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(
    kopecks / 100,
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function EventEditPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<{
    title?: string;
    category?: EventCategory;
    audience?: string | null;
    subcategories?: EventSubcategory[];
    imageUrl?: string;
    manualRating?: number | null;
    minAge?: number | null;
    description?: string;
    shortDescription?: string;
    venueId?: string | null;
    dateMode?: string;
    isPermanent?: boolean;
    endDate?: string | null;
    templateData?: Record<string, unknown>;
  }>({});

  // Venues list for museum linking
  const [venues, setVenues] = useState<VenueOption[]>([]);

  // Load venues for MUSEUM category linking
  useEffect(() => {
    adminApi
      .get<{ items: VenueOption[] } | VenueOption[]>('/admin/venues')
      .then((res: any) => {
        if (Array.isArray(res)) setVenues(res);
        else if (res?.items) setVenues(res.items);
        else setVenues([]);
      })
      .catch(() => setVenues([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    adminApi
      .get<EventDetail>(`/admin/events/${id}`)
      .then((data) => {
        setEvent(data);
        const ov = data.override;
        setForm({
          title: ov?.title ?? data.title,
          category: ov?.category ?? data.category,
          audience: ov?.audience ?? undefined,
          subcategories: ov?.subcategories?.length ? ov.subcategories : data.subcategories || [],
          imageUrl: ov?.imageUrl ?? data.imageUrl ?? '',
          manualRating: ov?.manualRating ?? data.rating,
          minAge: ov?.minAge ?? data.minAge,
          description: ov?.description ?? data.description ?? '',
          shortDescription: data.shortDescription ?? '',
          venueId: data.venueId ?? null,
          dateMode: data.dateMode ?? 'SCHEDULED',
          isPermanent: data.isPermanent ?? false,
          endDate: data.endDate ? data.endDate.slice(0, 10) : null,
          templateData: (ov as EventOverride)?.templateData ?? {},
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      // Save override fields
      const ov = await adminApi.patch(`/admin/events/${id}/override`, {
        title: form.title,
        category: form.category,
        audience: form.audience,
        subcategories: form.subcategories,
        imageUrl: form.imageUrl,
        manualRating: form.manualRating,
        minAge: form.minAge,
        description: form.description,
        shortDescription: form.shortDescription,
        templateData: form.templateData ?? {},
      });
      setEvent((prev) => (prev ? { ...prev, override: ov } : null));

      // Save venue-specific fields (direct on Event, not override)
      if (form.category === 'MUSEUM' || form.venueId || form.dateMode === 'OPEN_DATE') {
        const venueData = await adminApi.patch(`/admin/events/${id}/venue-settings`, {
          venueId: form.venueId,
          dateMode: form.dateMode || 'SCHEDULED',
          isPermanent: form.isPermanent ?? false,
          endDate: form.isPermanent ? null : form.endDate || null,
        });
        setEvent((prev) => (prev ? { ...prev, ...venueData } : null));
      }

      toast.success('Сохранено');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleResetOverride = () => {
    if (!id || !event?.override) return;
    if (!window.confirm('Сбросить все override? Данные вернутся к оригиналу из sync.')) return;
    setSaving(true);
    setError(null);
    adminApi
      .delete(`/admin/events/${id}/override`)
      .then(() => adminApi.get<EventDetail>(`/admin/events/${id}`))
      .then((data) => {
        setEvent(data);
        const ov = data.override;
        setForm({
          title: ov?.title ?? data.title,
          category: ov?.category ?? data.category,
          audience: ov?.audience ?? undefined,
          subcategories: ov?.subcategories?.length ? ov.subcategories : data.subcategories || [],
          imageUrl: ov?.imageUrl ?? data.imageUrl ?? '',
          manualRating: ov?.manualRating ?? data.rating,
          minAge: ov?.minAge ?? data.minAge,
          description: ov?.description ?? data.description ?? '',
          shortDescription: data.shortDescription ?? '',
          venueId: data.venueId ?? null,
          dateMode: data.dateMode ?? 'SCHEDULED',
          isPermanent: data.isPermanent ?? false,
          endDate: data.endDate ? data.endDate.slice(0, 10) : null,
          templateData: (ov as EventOverride)?.templateData ?? {},
        });
        toast.success('Override сброшен');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
      .finally(() => setSaving(false));
  };

  const handleToggleHidden = () => {
    if (!id) return;
    const newHidden = !(event?.override?.isHidden ?? false);
    setToggling(true);
    setError(null);
    adminApi
      .patch(`/admin/events/${id}/hide`, { isHidden: newHidden })
      .then((ov) => setEvent((prev) => (prev ? { ...prev, override: ov } : null)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка'))
      .finally(() => setToggling(false));
  };

  const isHidden = event?.override?.isHidden ?? false;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">{error || 'Событие не найдено'}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/events">Назад к списку</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/events">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{event.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{SOURCE_LABELS[event.source] || event.source}</Badge>
              {event.override && <Badge variant="warning">Override</Badge>}
              {isHidden && <Badge variant="destructive">Скрыт</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={isHidden ? 'default' : 'outline'} size="sm" onClick={handleToggleHidden} disabled={toggling}>
            {isHidden ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
            {isHidden ? 'Показать' : 'Скрыть'}
          </Button>
          {event.override && (
            <Button variant="outline" size="sm" onClick={handleResetOverride} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Сбросить
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Основное</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="offers">Офферы ({event.offers?.length || 0})</TabsTrigger>
          <TabsTrigger value="sessions">Сеансы ({event.sessions?.length || 0})</TabsTrigger>
          <TabsTrigger value="rating">Рейтинг</TabsTrigger>
        </TabsList>

        {/* ── General Tab ── */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Данные события</CardTitle>
              <CardDescription>Override значения из синхронизации</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Label>Название</Label>
                    {event && (
                      <span className="text-xs text-muted-foreground">
                        <span title="Из источника (TC, TEPLOHOD и т.д.)">Оригинал:</span>{' '}
                        <span className="font-medium">{event.title}</span>
                        {(form.title ?? event.override?.title) && (form.title ?? event.override?.title) !== event.title && (
                          <>
                            {' · '}
                            <span title="Показывается на сайте">Для Daibilet:</span>{' '}
                            <span className="font-medium">{form.title ?? event.override?.title}</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <Input
                    value={form.title ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={event?.title ? `Оригинал: ${event.title}` : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Категория</Label>
                    {(event?.override?.category != null || (event?.override?.subcategories?.length ?? 0) > 0) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        disabled={saving}
                        onClick={async () => {
                          if (!id) return;
                          setSaving(true);
                          try {
                            await adminApi.patch(`/admin/events/${id}/override`, {
                              category: null,
                              subcategories: [],
                            });
                            const data = await adminApi.get<EventDetail>(`/admin/events/${id}`);
                            setEvent(data);
                            const ov = data.override;
                            setForm((f) => ({
                              ...f,
                              category: ov?.category ?? data.category,
                              subcategories: ov?.subcategories?.length ? ov.subcategories : data.subcategories || [],
                            }));
                            toast.success('Категория сброшена к значениям из sync');
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'Ошибка');
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        Сбросить к sync
                      </Button>
                    )}
                  </div>
                  <Select
                    value={form.category ?? ''}
                    onValueChange={(v) => setForm((f) => ({ ...f, category: v as EventCategory, subcategories: [] }))}
                  >
                    <SelectTrigger>
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
                  <Label>Аудитория</Label>
                  <Select
                    value={form.audience ?? ''}
                    onValueChange={(v) => setForm((f) => ({ ...f, audience: v || null }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Авто (из синхронизации)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Для всех</SelectItem>
                      <SelectItem value="KIDS">Детям</SelectItem>
                      <SelectItem value="FAMILY">Семейный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Подкатегории</Label>
                  <div className="flex flex-wrap gap-2 rounded-md border p-3">
                    {(SUBCATEGORY_OPTIONS[form.category || ''] || []).map((opt) => {
                      const isChecked = (form.subcategories || []).includes(opt.value);
                      return (
                        <label
                          key={opt.value}
                          className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            isChecked
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-accent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setForm((f) => {
                                const curr = f.subcategories || [];
                                return {
                                  ...f,
                                  subcategories: e.target.checked
                                    ? [...curr, opt.value]
                                    : curr.filter((s) => s !== opt.value),
                                };
                              });
                            }}
                            className="sr-only"
                          />
                          {opt.label}
                        </label>
                      );
                    })}
                    {(SUBCATEGORY_OPTIONS[form.category || ''] || []).length === 0 && (
                      <span className="text-xs text-muted-foreground">Выберите категорию</span>
                    )}
                  </div>
                </div>
                {/* Venue & Date Mode — показываем для MUSEUM */}
                {form.category === 'MUSEUM' && (
                  <>
                    <div className="space-y-2">
                      <Label>Место (Venue)</Label>
                      <Select
                        value={form.venueId || '__none__'}
                        onValueChange={(v) => setForm((f) => ({ ...f, venueId: v === '__none__' ? null : v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Не привязано к месту" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Не привязано</SelectItem>
                          {venues.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.title} ({v.venueType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Режим даты</Label>
                      <Select
                        value={form.dateMode || 'SCHEDULED'}
                        onValueChange={(v) => setForm((f) => ({ ...f, dateMode: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SCHEDULED">По расписанию (сеансы)</SelectItem>
                          <SelectItem value="OPEN_DATE">Открытая дата (без сеансов)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {form.dateMode === 'OPEN_DATE' && (
                      <>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="isPermanent"
                            checked={form.isPermanent ?? false}
                            onChange={(e) => setForm((f) => ({ ...f, isPermanent: e.target.checked }))}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label htmlFor="isPermanent" className="cursor-pointer">
                            Постоянная экспозиция (без даты окончания)
                          </Label>
                        </div>
                        {!form.isPermanent && (
                          <div className="space-y-2">
                            <Label>Дата окончания</Label>
                            <Input
                              type="date"
                              value={form.endDate ?? ''}
                              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value || null }))}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                <div className="space-y-2">
                  <Label>URL изображения</Label>
                  <Input
                    value={form.imageUrl ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Мин. возраст</Label>
                  <Input
                    type="number"
                    value={form.minAge ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, minAge: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Описание</Label>
                  <Textarea
                    rows={5}
                    value={form.description ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>

              <EventTemplateFields
                category={form.category ?? event.category}
                subcategories={form.subcategories ?? event.subcategories ?? []}
                templateData={form.templateData ?? {}}
                onChange={(td) => setForm((f) => ({ ...f, templateData: td }))}
              />

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <Label>Теги</Label>
                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((t: any) => (
                        <Badge key={t.tag?.id ?? t.id} variant="secondary">
                          {t.tag?.name ?? t.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SEO Tab ── */}
        <TabsContent value="seo">
          <SeoMetaEditor entityType="EVENT" entityId={event.id} defaultTitle={event.title} />
        </TabsContent>

        {/* ── Offers Tab ── */}
        <TabsContent value="offers">
          <OffersSection eventId={event.id} offers={event.offers || []} />
        </TabsContent>

        {/* ── Sessions Tab ── */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Сеансы</CardTitle>
              <CardDescription>Ближайшие даты проведения</CardDescription>
            </CardHeader>
            <CardContent>
              {event.sessions && event.sessions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата / время</TableHead>
                      <TableHead>Доступно билетов</TableHead>
                      <TableHead>Цены</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {event.sessions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {new Date(s.startsAt).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>{s.availableTickets}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {(() => {
                            const p = s.prices;
                            if (!p) return '—';
                            if (Array.isArray(p)) return p.join(', ');
                            if (typeof p === 'object' && p.min != null) return `${p.min}–${p.max ?? p.min}`;
                            return String(p);
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-sm text-muted-foreground">Нет сеансов</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Rating Tab ── */}
        <TabsContent value="rating">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Current rating */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Текущий рейтинг</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                    <Star className="h-8 w-8 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{Number(event.rating ?? 0).toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">{event.reviewCount ?? 0} отзывов</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <Label>Рейтинг (override)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.manualRating ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, manualRating: e.target.value ? Number(e.target.value) : null }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* External rating */}
            <ExternalRatingSection eventId={event.id} event={event} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════
// ExternalRatingSection
// ═══════════════════════════════════════════

function ExternalRatingSection({ eventId, event }: { eventId: string; event: EventDetail }) {
  const [extRating, setExtRating] = useState(event.externalRating ? Number(event.externalRating) : 0);
  const [extCount, setExtCount] = useState(event.externalReviewCount ?? 0);
  const [extSource, setExtSource] = useState(event.externalSource ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.patch(`/admin/events/${eventId}/external-rating`, {
        externalRating: extRating > 0 ? extRating : null,
        externalReviewCount: extCount > 0 ? extCount : null,
        externalSource: extSource || null,
      });
      toast.success('Сохранено');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Внешний рейтинг</CardTitle>
        <CardDescription>Данные из Яндекс.Карт, 2GIS, Tripadvisor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Рейтинг (1.0—5.0)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={extRating || ''}
              onChange={(e) => setExtRating(e.target.value ? Number(e.target.value) : 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Кол-во отзывов</Label>
            <Input
              type="number"
              min="0"
              value={extCount || ''}
              onChange={(e) => setExtCount(e.target.value ? Number(e.target.value) : 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Источник</Label>
            <Select value={extSource || '__none__'} onValueChange={(v) => setExtSource(v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Не выбран" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Не выбран</SelectItem>
                <SelectItem value="yandex_maps">Яндекс.Карты</SelectItem>
                <SelectItem value="2gis">2GIS</SelectItem>
                <SelectItem value="tripadvisor">Tripadvisor</SelectItem>
                <SelectItem value="google_maps">Google Maps</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// OffersSection
// ═══════════════════════════════════════════

interface OfferFormData {
  source: string;
  purchaseType: string;
  externalEventId: string;
  metaEventId: string;
  deeplink: string;
  priceFrom: string; // string for input — convert to kopecks on save
  commissionPercent: string;
  priority: string;
  isPrimary: boolean;
  status: string;
  availabilityMode: string;
  badge: string;
  operatorId: string;
  // Operational info
  meetingPoint: string;
  meetingInstructions: string;
  operationalPhone: string;
  operationalNote: string;
}

const EMPTY_OFFER_FORM: OfferFormData = {
  source: 'MANUAL',
  purchaseType: 'REQUEST',
  externalEventId: '',
  metaEventId: '',
  deeplink: '',
  priceFrom: '',
  commissionPercent: '',
  priority: '0',
  isPrimary: false,
  status: 'ACTIVE',
  availabilityMode: '',
  badge: '',
  operatorId: '',
  meetingPoint: '',
  meetingInstructions: '',
  operationalPhone: '',
  operationalNote: '',
};

function OffersSection({ eventId, offers: initialOffers }: { eventId: string; offers: EventOffer[] }) {
  const [offers, setOffers] = useState<EventOffer[]>(initialOffers);
  const [busy, setBusy] = useState<string | null>(null);
  const [operators, setOperators] = useState<OperatorOption[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [formData, setFormData] = useState<OfferFormData>(EMPTY_OFFER_FORM);
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    setOffers(initialOffers);
  }, [initialOffers]);

  // Load operators once
  useEffect(() => {
    adminApi
      .get<any>('/admin/events/' + eventId)
      .then(() => adminApi.get<{ items: OperatorOption[] }>('/admin/settings/operators'))
      .catch(() => ({ items: [] }))
      .then((res: any) => {
        if (Array.isArray(res)) setOperators(res);
        else if (res?.items) setOperators(res.items);
      })
      .catch((e) => console.error('Load failed:', e));
  }, [eventId]);

  const refreshOffers = useCallback(async () => {
    try {
      const data = await adminApi.get<EventOffer[]>(`/admin/events/${eventId}/offers`);
      setOffers(data);
    } catch (e) {
      console.error('Load offers failed:', e);
    }
  }, [eventId]);

  const handleSetPrimary = async (offerId: string) => {
    setBusy(offerId);
    try {
      await adminApi.patch(`/admin/events/${eventId}/offers/${offerId}`, { isPrimary: true });
      await refreshOffers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(null);
    }
  };

  const handleToggleStatus = async (offerId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
    setBusy(offerId);
    try {
      await adminApi.patch(`/admin/events/${eventId}/offers/${offerId}`, { status: newStatus });
      await refreshOffers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(null);
    }
  };

  // Open create dialog
  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingOfferId(null);
    setFormData(EMPTY_OFFER_FORM);
    setDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (offer: EventOffer) => {
    setDialogMode('edit');
    setEditingOfferId(offer.id);
    setFormData({
      source: offer.source,
      purchaseType: offer.purchaseType,
      externalEventId: offer.externalEventId || '',
      metaEventId: offer.metaEventId || '',
      deeplink: offer.deeplink || '',
      priceFrom: offer.priceFrom ? String(offer.priceFrom / 100) : '',
      commissionPercent: offer.commissionPercent != null ? String(offer.commissionPercent) : '',
      priority: String(offer.priority),
      isPrimary: offer.isPrimary,
      status: offer.status,
      availabilityMode: offer.availabilityMode || '',
      badge: offer.badge || '',
      operatorId: offer.operatorId || '',
      meetingPoint: (offer as any).meetingPoint || '',
      meetingInstructions: (offer as any).meetingInstructions || '',
      operationalPhone: (offer as any).operationalPhone || '',
      operationalNote: (offer as any).operationalNote || '',
    });
    setDialogOpen(true);
  };

  // Clone offer
  const handleClone = async (offerId: string) => {
    setBusy(offerId);
    try {
      await adminApi.post(`/admin/events/${eventId}/offers/${offerId}/clone`);
      toast.success('Оффер клонирован');
      await refreshOffers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(null);
    }
  };

  // Delete offer
  const handleDelete = async (offerId: string) => {
    if (!window.confirm('Удалить этот оффер? Действие необратимо.')) return;
    setBusy(offerId);
    try {
      await adminApi.delete(`/admin/events/${eventId}/offers/${offerId}`);
      toast.success('Оффер удалён');
      await refreshOffers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(null);
    }
  };

  // Save (create or update)
  const handleSaveOffer = async () => {
    setFormSaving(true);
    try {
      const payload: any = {
        source: formData.source,
        purchaseType: formData.purchaseType,
        externalEventId: formData.externalEventId || undefined,
        metaEventId: formData.metaEventId || undefined,
        deeplink: formData.deeplink || undefined,
        priceFrom: formData.priceFrom ? Math.round(Number(formData.priceFrom) * 100) : undefined,
        commissionPercent: formData.commissionPercent ? Number(formData.commissionPercent) : undefined,
        priority: Number(formData.priority) || 0,
        isPrimary: formData.isPrimary,
        status: formData.status,
        availabilityMode: formData.availabilityMode || undefined,
        badge: formData.badge || undefined,
        operatorId: formData.operatorId || undefined,
        // Operational info
        meetingPoint: formData.meetingPoint || null,
        meetingInstructions: formData.meetingInstructions || null,
        operationalPhone: formData.operationalPhone || null,
        operationalNote: formData.operationalNote || null,
      };

      if (dialogMode === 'create') {
        await adminApi.post(`/admin/events/${eventId}/offers`, payload);
        toast.success('Оффер создан');
      } else if (editingOfferId) {
        await adminApi.put(`/admin/events/${eventId}/offers/${editingOfferId}`, payload);
        toast.success('Оффер обновлён');
      }

      setDialogOpen(false);
      await refreshOffers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setFormSaving(false);
    }
  };

  const updateField = (field: keyof OfferFormData, value: string | boolean) => {
    setFormData((f) => ({ ...f, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Офферы / Источники продажи</CardTitle>
            <CardDescription>Управление предложениями из разных систем</CardDescription>
          </div>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить оффер
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {offers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Источник</TableHead>
                <TableHead>Тип покупки</TableHead>
                <TableHead>Цена от</TableHead>
                <TableHead>Комиссия</TableHead>
                <TableHead>Сеансы</TableHead>
                <TableHead>Бейдж</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow key={offer.id} className={offer.isPrimary ? 'bg-primary/5' : ''}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{SOURCE_LABELS[offer.source] || offer.source}</span>
                        {offer.isPrimary && (
                          <Badge variant="default" className="text-[10px]">
                            Primary
                          </Badge>
                        )}
                      </div>
                      {offer.operator && <span className="text-xs text-muted-foreground">{offer.operator.name}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{PURCHASE_TYPE_LABELS[offer.purchaseType] || offer.purchaseType}</span>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">{formatPrice(offer.priceFrom)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {offer.commissionPercent != null ? `${offer.commissionPercent}%` : '—'}
                  </TableCell>
                  <TableCell className="tabular-nums">{offer._count?.sessions ?? 0}</TableCell>
                  <TableCell>
                    {offer.badge ? (
                      <Badge variant="outline" className="text-[10px]">
                        {offer.badge}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        offer.status === 'ACTIVE' ? 'success' : offer.status === 'HIDDEN' ? 'warning' : 'destructive'
                      }
                    >
                      {offer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!offer.isPrimary && offer.status === 'ACTIVE' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetPrimary(offer.id)}
                          disabled={busy === offer.id}
                          title="Сделать основным"
                        >
                          Primary
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(offer)}
                        disabled={busy === offer.id}
                        title="Редактировать"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClone(offer.id)}
                        disabled={busy === offer.id}
                        title="Клонировать"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={offer.status === 'ACTIVE' ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => handleToggleStatus(offer.id, offer.status)}
                        disabled={busy === offer.id}
                      >
                        {offer.status === 'ACTIVE' ? 'Скрыть' : 'Активировать'}
                      </Button>
                      {offer.source === 'MANUAL' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(offer.id)}
                          disabled={busy === offer.id}
                          className="text-destructive hover:text-destructive"
                          title="Удалить"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">Нет офферов</p>
            <Button variant="outline" size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Создать первый оффер
            </Button>
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Новый оффер' : 'Редактирование оффера'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'create' ? 'Добавить способ покупки для этого события' : 'Обновить данные оффера'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Source */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Источник</Label>
                <Select value={formData.source} onValueChange={(v) => updateField('source', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Ручной</SelectItem>
                    <SelectItem value="TC">TicketsCloud</SelectItem>
                    <SelectItem value="TEPLOHOD">Теплоход</SelectItem>
                    <SelectItem value="RADARIO">Radario</SelectItem>
                    <SelectItem value="TIMEPAD">TimePad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Тип покупки</Label>
                <Select value={formData.purchaseType} onValueChange={(v) => updateField('purchaseType', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WIDGET">Виджет (TC и др.)</SelectItem>
                    <SelectItem value="REDIRECT">Внешняя ссылка</SelectItem>
                    <SelectItem value="REQUEST">Заявка</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* URL / External IDs */}
            {(formData.purchaseType === 'REDIRECT' || formData.purchaseType === 'REQUEST') && (
              <div className="space-y-2">
                <Label>URL / Deep Link</Label>
                <Input
                  value={formData.deeplink}
                  onChange={(e) => updateField('deeplink', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}
            {formData.purchaseType === 'WIDGET' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>External Event ID</Label>
                  <Input
                    value={formData.externalEventId}
                    onChange={(e) => updateField('externalEventId', e.target.value)}
                    placeholder="ID в системе провайдера"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Event ID</Label>
                  <Input
                    value={formData.metaEventId}
                    onChange={(e) => updateField('metaEventId', e.target.value)}
                    placeholder="Для TC повторяющихся"
                  />
                </div>
              </div>
            )}

            {/* Price & Commission */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Цена от (руб.)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.priceFrom}
                  onChange={(e) => updateField('priceFrom', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Комиссия %</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.commissionPercent}
                  onChange={(e) => updateField('commissionPercent', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Priority & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => updateField('priority', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="HIDDEN">Hidden</SelectItem>
                    <SelectItem value="DISABLED">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Availability & Badge */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Доступность</Label>
                <Select
                  value={formData.availabilityMode || '__none__'}
                  onValueChange={(v) => updateField('availabilityMode', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Не задано" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Не задано</SelectItem>
                    <SelectItem value="UNKNOWN">Неизвестно</SelectItem>
                    <SelectItem value="LIMITED">Ограничено</SelectItem>
                    <SelectItem value="SOLD_OUT">Распродано</SelectItem>
                    <SelectItem value="BY_API">По API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Бейдж</Label>
                <Select
                  value={formData.badge || '__none__'}
                  onValueChange={(v) => updateField('badge', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Без бейджа" />
                  </SelectTrigger>
                  <SelectContent>
                    {BADGE_OPTIONS.map((o) => (
                      <SelectItem key={o.value || '__none__'} value={o.value || '__none__'}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Operator */}
            {operators.length > 0 && (
              <div className="space-y-2">
                <Label>Оператор</Label>
                <Select
                  value={formData.operatorId || '__none__'}
                  onValueChange={(v) => updateField('operatorId', v === '__none__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Без оператора" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Без оператора</SelectItem>
                    {operators.map((op) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Operational Info */}
            <div className="border-t pt-4 mt-2 space-y-3">
              <p className="text-sm font-semibold text-slate-700">Операционная информация</p>
              <p className="text-xs text-slate-500">
                Показывается клиенту только после подтверждения заказа (в email и трекинге). НЕ указывайте офисные
                контакты поставщика — только данные для визита.
              </p>
              <div className="space-y-2">
                <Label>Место встречи / адрес</Label>
                <Input
                  value={formData.meetingPoint}
                  onChange={(e) => updateField('meetingPoint', e.target.value)}
                  placeholder="Дворцовая площадь, у Александровской колонны"
                />
              </div>
              <div className="space-y-2">
                <Label>Как добраться / инструкции</Label>
                <textarea
                  value={formData.meetingInstructions}
                  onChange={(e) => updateField('meetingInstructions', e.target.value)}
                  placeholder="Метро «Адмиралтейская», выход на Невский проспект, 10 мин пешком..."
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Телефон на месте</Label>
                  <Input
                    value={formData.operationalPhone}
                    onChange={(e) => updateField('operationalPhone', e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Доп. заметки для клиента</Label>
                <textarea
                  value={formData.operationalNote}
                  onChange={(e) => updateField('operationalNote', e.target.value)}
                  placeholder="Возьмите с собой паспорт. Дресс-код: закрытые плечи и колени..."
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Primary checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={formData.isPrimary}
                onChange={(e) => updateField('isPrimary', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isPrimary" className="cursor-pointer">
                Основной оффер (Primary)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveOffer} disabled={formSaving}>
              {formSaving ? 'Сохранение...' : dialogMode === 'create' ? 'Создать' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
