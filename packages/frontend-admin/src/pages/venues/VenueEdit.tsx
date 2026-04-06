type VenueType = 'MUSEUM' | 'GALLERY' | 'ART_SPACE' | 'EXHIBITION_HALL' | 'THEATER' | 'PALACE' | 'PARK';
import { galleryItemsToUrls, legacyUrlToItem, getVenueTemplateSpecs } from '@daibilet/shared';
import { ErrorState, ImageGalleryManager, LoadingState, PageHeader } from '@daibilet/shared-ui';
import { ArrowLeft, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { adminApi } from '@/api/client';
import { deleteAdminMediaImages, uploadAdminMediaImages } from '@/api/media';
import { getVenueAdminSummary, type VenueAdminSummary } from '@/api/adminVenueSummary';
import { ContentBlocksPanel } from '@/components/content/ContentBlocksPanel';
import { VenueAdminSummaryPanel } from '@/components/venues/VenueAdminSummaryPanel';
import { SeoMetaEditor } from '@/components/SeoMetaEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUploadField } from '@/components/forms/ImageUploadField';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const VENUE_TYPES = [
  { value: 'MUSEUM', label: 'Музей' },
  { value: 'GALLERY', label: 'Галерея' },
  { value: 'ART_SPACE', label: 'Арт-пространство' },
  { value: 'EXHIBITION_HALL', label: 'Выставочный зал' },
  { value: 'THEATER', label: 'Театр' },
  { value: 'PALACE', label: 'Дворец' },
  { value: 'PARK', label: 'Парк' },
] as const;

type VenueTypeValue = (typeof VENUE_TYPES)[number]['value'];

const VENUE_COMMISSION_DEFAULTS: Record<VenueTypeValue, { defaultRate: number; label: string }> = {
  MUSEUM: {
    defaultRate: 15,
    label: 'Ориентир 15% — фиксированная ставка задаётся вручную под договор',
  },
  GALLERY: {
    defaultRate: 15,
    label: 'Ориентир 15% — фиксированная ставка задаётся вручную под договор',
  },
  ART_SPACE: {
    defaultRate: 15,
    label: 'Ориентир 15% — фиксированная ставка задаётся вручную под договор',
  },
  EXHIBITION_HALL: {
    defaultRate: 15,
    label: 'Ориентир 15% — фиксированная ставка задаётся вручную под договор',
  },
  THEATER: {
    defaultRate: 15,
    label: 'Ориентир 15% — фиксированная ставка задаётся вручную под договор',
  },
  PALACE: {
    defaultRate: 15,
    label: 'Ориентир 15% — фиксированная ставка задаётся вручную под договор',
  },
  PARK: {
    defaultRate: 15,
    label: 'Ориентир 15% — фиксированная ставка задаётся вручную под договор',
  },
};

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<string, string> = {
  mon: 'Пн',
  tue: 'Вт',
  wed: 'Ср',
  thu: 'Чт',
  fri: 'Пт',
  sat: 'Сб',
  sun: 'Вс',
};

type AdminSubcategory = {
  id: string;
  slug: string;
  code?: string;
  nameRu: string;
  type: 'UNIVERSAL' | 'EVENT_ONLY' | 'VENUE_ONLY';
  layer?: string;
  parent?: { id: string; slug: string; nameRu: string } | null;
};

type VenueSubcategoriesResponse = {
  primarySubcategory: AdminSubcategory | null;
  secondarySubcategories: AdminSubcategory[];
  all: AdminSubcategory[];
};

interface VenueFormData {
  title: string;
  shortTitle: string;
  slug: string;
  venueType: string;
  cityId: string;
  description: string;
  shortDescription: string;
  imageUrl: string;
  galleryUrls: string[];
  address: string;
  lat: string;
  lng: string;
  metro: string;
  district: string;
  phone: string;
  email: string;
  website: string;
  openingHours: Record<string, string>;
  priceFrom: string;
  operatorId: string;
  isActive: boolean;
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
  externalRating: string;
  externalSource: string;
  // Conversion fields
  highlights: string[];
  faq: Array<{ q: string; a: string }>;
  features: string[];
  commissionRate: string;
  version: number;
  /** Типизированные блоки PDP (venueTemplateData) */
  venueTemplateData: Record<string, unknown>;
}

const FEATURE_OPTIONS = [
  { value: 'no_queue', label: 'Без очереди' },
  { value: 'audio_guide', label: 'Аудиогид' },
  { value: 'kids_friendly', label: 'Подходит детям' },
  { value: 'wheelchair', label: 'Доступная среда' },
  { value: 'guided_tour', label: 'С экскурсоводом' },
  { value: 'photo_allowed', label: 'Можно фотографировать' },
  { value: 'cafe', label: 'Есть кафе' },
  { value: 'gift_shop', label: 'Сувенирный магазин' },
];

const defaultForm: VenueFormData = {
  title: '',
  shortTitle: '',
  slug: '',
  venueType: 'MUSEUM',
  cityId: '',
  description: '',
  shortDescription: '',
  imageUrl: '',
  galleryUrls: [],
  address: '',
  lat: '',
  lng: '',
  metro: '',
  district: '',
  phone: '',
  email: '',
  website: '',
  openingHours: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  priceFrom: '',
  operatorId: '',
  isActive: true,
  isFeatured: false,
  metaTitle: '',
  metaDescription: '',
  externalRating: '',
  externalSource: '',
  highlights: [],
  faq: [],
  features: [],
  commissionRate: '',
  version: 0,
  venueTemplateData: {},
};

export function VenueEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new' || !id;

  const [form, setForm] = useState<VenueFormData>(defaultForm);
  const [cities, setCities] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [operators, setOperators] = useState<Array<{ id: string; name: string }>>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venueSummary, setVenueSummary] = useState<VenueAdminSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [venuePrimaryOptions, setVenuePrimaryOptions] = useState<AdminSubcategory[]>([]);
  const [venueSecondaryOptions, setVenueSecondaryOptions] = useState<AdminSubcategory[]>([]);
  const [selectedVenuePrimaryId, setSelectedVenuePrimaryId] = useState<string | null>(null);
  const [selectedVenueSecondaryIds, setSelectedVenueSecondaryIds] = useState<string[]>([]);

  useEffect(() => {
    // Load cities
    adminApi
      .get<any>('/admin/cities')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.items ?? []);
        setCities(list);
      })
      .catch((e) => console.error('Load cities failed:', e));

    // Load operators for venue partnership
    adminApi
      .get<any>('/admin/suppliers')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.items ?? []);
        setOperators(list);
      })
      .catch((e) => console.error('Load operators failed:', e));

    adminApi
      .get<AdminSubcategory[]>('/admin/subcategories?entity=venue&layer=PRIMARY')
      .then((data) => setVenuePrimaryOptions(Array.isArray(data) ? data : []))
      .catch(() => setVenuePrimaryOptions([]));
    adminApi
      .get<AdminSubcategory[]>('/admin/subcategories?entity=venue&layer=SECONDARY')
      .then((data) => setVenueSecondaryOptions(Array.isArray(data) ? data : []))
      .catch(() => setVenueSecondaryOptions([]));

    if (!isNew && id) {
      setLoading(true);
      setSummaryLoading(true);
      getVenueAdminSummary(id)
        .then((s) => setVenueSummary(s))
        .catch((e) => setSummaryError(e instanceof Error ? e.message : 'Ошибка сводки'))
        .finally(() => setSummaryLoading(false));
      adminApi
        .get<any>(`/admin/venues/${id}`)
        .then(async (venue) => {
          setForm({
            title: venue.title || '',
            shortTitle: venue.shortTitle || '',
            slug: venue.slug || '',
            venueType: venue.venueType || 'MUSEUM',
            cityId: venue.city?.id || venue.cityId || '',
            description: venue.description || '',
            shortDescription: venue.shortDescription || '',
            imageUrl: venue.imageUrl || '',
            galleryUrls: venue.galleryUrls || [],
            address: venue.address || '',
            lat: venue.lat?.toString() || '',
            lng: venue.lng?.toString() || '',
            metro: venue.metro || '',
            district: venue.district || '',
            phone: venue.phone || '',
            email: venue.email || '',
            website: venue.website || '',
            openingHours: venue.openingHours || defaultForm.openingHours,
            priceFrom: venue.priceFrom != null ? String(venue.priceFrom / 100) : '',
            operatorId: venue.operator?.id || venue.operatorId || '',
            isActive: venue.isActive ?? true,
            isFeatured: venue.isFeatured ?? false,
            metaTitle: venue.metaTitle || '',
            metaDescription: venue.metaDescription || '',
            externalRating: venue.externalRating?.toString() || '',
            externalSource: venue.externalSource || '',
            highlights: venue.highlights || [],
            faq: venue.faq || [],
            features: venue.features || [],
            commissionRate: venue.commissionRate?.toString() || '',
            version: venue.version ?? 0,
            venueTemplateData:
              venue.venueTemplateData && typeof venue.venueTemplateData === 'object'
                ? (venue.venueTemplateData as Record<string, unknown>)
                : {},
          });
          setEvents(venue.events || []);
          setOffers(venue.offers || []);

          const vsc = await adminApi
            .get<VenueSubcategoriesResponse>(`/admin/venues/${id}/subcategories`)
            .catch(() => null);
          setSelectedVenuePrimaryId(vsc?.primarySubcategory?.id ?? null);
          setSelectedVenueSecondaryIds(vsc?.secondarySubcategories?.map((s) => s.id) ?? []);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        ...form,
        // UI работает в рублях, в API отправляем в копейках
        priceFrom: form.priceFrom ? Math.round(Number(form.priceFrom) * 100) : null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        externalRating: form.externalRating ? Number(form.externalRating) : null,
        openingHours: Object.fromEntries(Object.entries(form.openingHours).map(([k, v]) => [k, v || null])),
        operatorId: form.operatorId || null,
        highlights: form.highlights.length > 0 ? form.highlights : null,
        faq: form.faq.length > 0 ? form.faq : null,
        features: form.features,
        commissionRate: form.commissionRate ? Number(form.commissionRate) : null,
      };

      if (isNew) {
        const { version: _omitVersion, ...createPayload } = payload;
        const result = await adminApi.post<any>('/admin/venues', createPayload);
        navigate(`/venues/${result.id}`, { replace: true });
      } else {
        await adminApi.patch(`/admin/venues/${id}`, payload);
        const pRow = venuePrimaryOptions.find((p) => p.id === selectedVenuePrimaryId);
        if (!pRow?.code) {
          setError('Выберите основной формат площадки (PRIMARY)');
          setSaving(false);
          return;
        }
        const sRows = venueSecondaryOptions.filter((s) => selectedVenueSecondaryIds.includes(s.id));
        await adminApi.post(`/admin/venues/${id}/subcategories`, {
          primaryCode: pRow.code,
          secondaryCodes: sRows.map((s) => s.code).filter(Boolean) as string[],
        });
        setForm((f) => ({ ...f, version: f.version + 1 }));
        if (id) {
          setSummaryLoading(true);
          getVenueAdminSummary(id)
            .then((s) => setVenueSummary(s))
            .catch((e) => setSummaryError(e instanceof Error ? e.message : 'Ошибка сводки'))
            .finally(() => setSummaryLoading(false));
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить место? Это действие можно отменить.')) return;
    try {
      await adminApi.delete(`/admin/venues/${id}`);
      navigate('/venues');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const updateField = (key: keyof VenueFormData, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const updateHours = (day: string, value: string) => {
    setForm((f) => ({ ...f, openingHours: { ...f.openingHours, [day]: value } }));
  };

  if (loading) {
    return <LoadingState label="Загружаем площадку..." />;
  }

  if (isNew) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Новая площадка"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/venues')}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Назад
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-1">
                <Save className="h-4 w-4" />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          }
        />

        {error && (
          <ErrorState title="Ошибка загрузки площадки" description={error} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Основное</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium mb-1 block">Название</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="Эрмитаж"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium mb-1 block">Город</Label>
                    <Select value={form.cityId || '__none__'} onValueChange={(v) => updateField('cityId', v === '__none__' ? '' : v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Город" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Город</SelectItem>
                        {cities.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-1 block">Тип</Label>
                    <Select value={form.venueType} onValueChange={(v) => updateField('venueType', v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Тип" />
                      </SelectTrigger>
                      <SelectContent>
                        {VENUE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-1 block">Адрес</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="Дворцовая площадь, 2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium mb-1 block">Lat</Label>
                    <Input
                      value={form.lat}
                      onChange={(e) => updateField('lat', e.target.value)}
                      placeholder="59.9398"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1 block">Lng</Label>
                    <Input
                      value={form.lng}
                      onChange={(e) => updateField('lng', e.target.value)}
                      placeholder="30.3146"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Цена и рейтинг</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-info">i</span>
                  <span>
                    Рейтинг и «цена от» рассчитываются автоматически на основе привязанных событий. Можно задать вручную для переопределения.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium mb-1 block">Цена от (переопр.)</Label>
                    <Input
                      type="number"
                      value={form.priceFrom}
                      onChange={(e) => updateField('priceFrom', e.target.value)}
                      placeholder="Авто"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1 block">Рейтинг (переопр.)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={form.externalRating}
                      onChange={(e) => updateField('externalRating', e.target.value)}
                      placeholder="Авто"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-1">Карта</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg h-40 bg-muted flex items-center justify-center text-sm text-muted-foreground">
                  Укажите координаты
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-1">Связанные события</CardTitle>
              </CardHeader>
              <CardContent>
                {events.length > 0 ? (
                  <div className="space-y-2">
                    {events.map((e: any) => (
                      <Link key={e.id} to={`/events/${e.id}`}>
                        <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-sm">
                          <span className="flex-1 truncate">{e.title}</span>
                          <Badge variant="outline" className="text-[10px]">
                            active
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Пока нет связанных событий</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? 'Новое место' : form.title || 'Редактирование'}
        subtitle={!isNew ? `v${form.version}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/venues')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Назад
            </Button>
            {!isNew && (
              <Button
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={async () => {
                  if (!id) return;
                  if (Object.keys(form).length > 0 && !saving) {
                    const proceed = window.confirm(
                      'Предпросмотр показывает последнюю сохранённую версию площадки. Продолжить?',
                    );
                    if (!proceed) return;
                  }
                  try {
                    const res = await adminApi.post<{ previewUrl: string }>(`/admin/previews/venues/${id}`);
                    if (res.previewUrl) {
                      window.open(res.previewUrl, '_blank', 'noopener,noreferrer');
                    }
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Не удалось открыть предпросмотр');
                  }
                }}
                title="Открыть предпросмотр площадки"
              >
                Предпросмотр
              </Button>
            )}
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
        }
      />

      {error && (
        <ErrorState title="Ошибка сохранения площадки" description={error} />
      )}

      {!isNew && id && (
        <VenueAdminSummaryPanel
          summary={venueSummary}
          loading={summaryLoading}
          error={summaryError}
        />
      )}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Основное</TabsTrigger>
          <TabsTrigger value="location">Расположение</TabsTrigger>
          <TabsTrigger value="hours">Часы работы</TabsTrigger>
          <TabsTrigger value="gallery">Галерея</TabsTrigger>
          <TabsTrigger value="conversion">Конверсия</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="content-pdp">Контент PDP</TabsTrigger>
          {!isNew && <TabsTrigger value="events">Выставки ({events.length})</TabsTrigger>}
          {!isNew && <TabsTrigger value="offers">Способы покупки ({offers.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Название *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="Государственный Эрмитаж"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Короткое название</Label>
                  <Input
                    value={form.shortTitle}
                    onChange={(e) => updateField('shortTitle', e.target.value)}
                    placeholder="Эрмитаж"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Тип *</Label>
                  <Select value={form.venueType} onValueChange={(v) => updateField('venueType', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VENUE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Город *</Label>
                  <Select value={form.cityId} onValueChange={(v) => updateField('cityId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите город" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => updateField('slug', e.target.value)}
                    placeholder="ermitazh (авто)"
                  />
                </div>
              </div>

              {!isNew && (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="space-y-2">
                    <Label>Основной формат площадки (обязательно)</Label>
                    <Select
                      value={selectedVenuePrimaryId ?? '__none__'}
                      onValueChange={(v) => setSelectedVenuePrimaryId(v === '__none__' ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите формат" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Не выбрано</SelectItem>
                        {venuePrimaryOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.nameRu} ({opt.code ?? opt.slug})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Доп. подкатегории (до 3)</Label>
                    <div className="flex flex-wrap gap-2">
                      {venueSecondaryOptions.map((opt) => {
                        const isChecked = selectedVenueSecondaryIds.includes(opt.id);
                        return (
                          <label
                            key={opt.id}
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
                                setSelectedVenueSecondaryIds((prev) => {
                                  if (e.target.checked) {
                                    if (prev.length >= 3) return prev;
                                    return [...prev, opt.id];
                                  }
                                  return prev.filter((sid) => sid !== opt.id);
                                });
                              }}
                              className="sr-only"
                            />
                            {opt.nameRu}
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Доп.: {selectedVenueSecondaryIds.length}/3. Сохраняется при «Сохранить».
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Краткое описание</Label>
                <Textarea
                  value={form.shortDescription}
                  onChange={(e) => updateField('shortDescription', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Описание (HTML/Markdown)</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={8}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ImageUploadField
                  label="URL обложки"
                  value={form.imageUrl || null}
                  onChange={(v) => updateField('imageUrl', v ?? '')}
                  disabled={saving}
                />
                <div className="space-y-2">
                  <Label>Цена от (руб.)</Label>
                  <Input
                    type="number"
                    value={form.priceFrom}
                    onChange={(e) => updateField('priceFrom', e.target.value)}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Партнёр-оператор</Label>
                  <Select
                    value={form.operatorId || 'none'}
                    onValueChange={(v) => updateField('operatorId', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Не выбран" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не выбран</SelectItem>
                      {operators.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+7 (812) 710-90-79"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="info@hermitage.ru"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Сайт</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://hermitagemuseum.org"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Внешний рейтинг</Label>
                  <Input
                    value={form.externalRating}
                    onChange={(e) => updateField('externalRating', e.target.value)}
                    placeholder="4.8"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Источник рейтинга</Label>
                  <Select
                    value={form.externalSource || 'none'}
                    onValueChange={(v) => updateField('externalSource', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Нет</SelectItem>
                      <SelectItem value="yandex_maps">Яндекс.Карты</SelectItem>
                      <SelectItem value="2gis">2ГИС</SelectItem>
                      <SelectItem value="tripadvisor">Tripadvisor</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => updateField('isActive', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Активно</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => updateField('isFeatured', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">На главной</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Расположение</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Адрес</Label>
                <Input
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Дворцовая пл., 2"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Метро</Label>
                  <Input
                    value={form.metro}
                    onChange={(e) => updateField('metro', e.target.value)}
                    placeholder="Адмиралтейская"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Район</Label>
                  <Input
                    value={form.district}
                    onChange={(e) => updateField('district', e.target.value)}
                    placeholder="Центральный"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Широта (lat)</Label>
                  <Input value={form.lat} onChange={(e) => updateField('lat', e.target.value)} placeholder="59.9398" />
                </div>
                <div className="space-y-2">
                  <Label>Долгота (lng)</Label>
                  <Input value={form.lng} onChange={(e) => updateField('lng', e.target.value)} placeholder="30.3146" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Часы работы</CardTitle>
              <CardDescription>Формат: 10:00-18:00. Пустое поле = выходной.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {DAY_KEYS.map((day) => (
                <div key={day} className="flex items-center gap-4">
                  <span className="w-8 font-medium text-sm">{DAY_LABELS[day]}</span>
                  <Input
                    value={form.openingHours[day] || ''}
                    onChange={(e) => updateHours(day, e.target.value)}
                    placeholder="10:00-18:00"
                    className="max-w-xs"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Фотогалерея</CardTitle>
              <CardDescription>Загрузка в Cloudinary, порядок — перетаскиванием.</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageGalleryManager
                title="Галерея площадки"
                description={`Сейчас ${form.galleryUrls.length} фото. Обложка задаётся на вкладке «Основное».`}
                items={form.galleryUrls.map((url, i) => legacyUrlToItem(url, i))}
                onChange={(items) => updateField('galleryUrls', galleryItemsToUrls(items))}
                uploadFiles={uploadAdminMediaImages}
                deleteByPublicIds={deleteAdminMediaImages}
                maxImages={40}
                disabled={saving}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          {/* Commission */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Комиссия</CardTitle>
              <CardDescription>
                {form.venueType && VENUE_COMMISSION_DEFAULTS[form.venueType as VenueType]
                  ? `По умолчанию: ${VENUE_COMMISSION_DEFAULTS[form.venueType as VenueType].label}`
                  : 'Выберите тип места для рекомендации по комиссии'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Индивидуальная комиссия, %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.commissionRate}
                    onChange={(e) => updateField('commissionRate', e.target.value)}
                    placeholder={`Авто: ${(form.venueType && VENUE_COMMISSION_DEFAULTS[form.venueType as VenueType]?.defaultRate) || 15}%`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Пустое = используется ставка по типу. Промо-ставка для новых: 7%.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Highlights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Highlights (5-7 ключевых фактов)</CardTitle>
              <CardDescription>Коротко: что есть в этом месте. Показываются на странице как буллеты.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.highlights.map((h, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={h}
                    onChange={(e) => {
                      const updated = [...form.highlights];
                      updated[i] = e.target.value;
                      updateField('highlights', updated);
                    }}
                    placeholder="Например: 3 млн экспонатов"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateField(
                        'highlights',
                        form.highlights.filter((_, idx) => idx !== i),
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => updateField('highlights', [...form.highlights, ''])}>
                <Plus className="h-4 w-4 mr-1" /> Добавить факт
              </Button>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Особенности (Features)</CardTitle>
              <CardDescription>Отметьте, что доступно в этом месте.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {FEATURE_OPTIONS.map((feat) => (
                  <label
                    key={feat.value}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={form.features.includes(feat.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateField('features', [...form.features, feat.value]);
                        } else {
                          updateField(
                            'features',
                            form.features.filter((f) => f !== feat.value),
                          );
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{feat.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">FAQ (частые вопросы)</CardTitle>
              <CardDescription>Повышает доверие и SEO. Формат: вопрос → ответ.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.faq.map((item, i) => (
                <div key={i} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Вопрос {i + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateField(
                          'faq',
                          form.faq.filter((_, idx) => idx !== i),
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <Input
                    value={item.q}
                    onChange={(e) => {
                      const updated = [...form.faq];
                      updated[i] = { ...updated[i], q: e.target.value };
                      updateField('faq', updated);
                    }}
                    placeholder="Можно ли вернуть билет?"
                  />
                  <Textarea
                    value={item.a}
                    onChange={(e) => {
                      const updated = [...form.faq];
                      updated[i] = { ...updated[i], a: e.target.value };
                      updateField('faq', updated);
                    }}
                    placeholder="Да, возврат возможен до начала визита..."
                    rows={2}
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => updateField('faq', [...form.faq, { q: '', a: '' }])}>
                <Plus className="h-4 w-4 mr-1" /> Добавить вопрос
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          {!isNew && id && (
            <SeoMetaEditor
              entityType="VENUE"
              entityId={id}
              defaultTitle={form.title}
              previewPath={form.slug ? `/venues/${form.slug}` : '/venues/slug'}
            />
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Legacy SEO (Venue)</CardTitle>
              <CardDescription>metaTitle/metaDescription на модели Venue — используется как fallback</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Meta Title</Label>
                <Input
                  value={form.metaTitle}
                  onChange={(e) => updateField('metaTitle', e.target.value)}
                  placeholder="Авто: Название — билеты, часы работы | Дайбилет"
                />
              </div>
              <div className="space-y-2">
                <Label>Meta Description</Label>
                <Textarea
                  value={form.metaDescription}
                  onChange={(e) => updateField('metaDescription', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content-pdp" className="space-y-4">
          <ContentBlocksPanel
            cardTitle="Контент PDP (venueTemplateData)"
            cardDescription="Типизированные блоки для страницы площадки. Набор полей зависит от типа места (venueType)."
            fieldSpecs={getVenueTemplateSpecs(form.venueType)}
            value={form.venueTemplateData}
            onChange={(v) => updateField('venueTemplateData', v)}
          />
        </TabsContent>

        {!isNew && (
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Выставки и экспозиции</CardTitle>
                <CardDescription>События, привязанные к этому месту</CardDescription>
              </CardHeader>
              <CardContent>
                {events.length > 0 ? (
                  <div className="space-y-2">
                    {events.map((e: any) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div>
                          <span className="font-medium">{e.title}</span>
                          <div className="flex gap-2 mt-1">
                            {e.isPermanent && <Badge variant="outline">Постоянная</Badge>}
                            {e.dateMode === 'OPEN_DATE' && <Badge variant="secondary">Открытая дата</Badge>}
                            {e.endDate && (
                              <span className="text-xs text-muted-foreground">
                                до {new Date(e.endDate).toLocaleDateString('ru-RU')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link to={`/events/${e.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Нет привязанных выставок</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {!isNew && (
          <TabsContent value="offers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Офферы (билеты)</CardTitle>
                <CardDescription>Прямые офферы к месту</CardDescription>
              </CardHeader>
              <CardContent>
                {offers.length > 0 ? (
                  <div className="space-y-2">
                    {offers.map((o: any) => (
                      <div key={o.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">{o.source}</span>
                          <span className="ml-2 text-sm text-muted-foreground">{o.purchaseType}</span>
                          {o.badge && (
                            <Badge className="ml-2" variant="outline">
                              {o.badge}
                            </Badge>
                          )}
                        </div>
                        <span className="font-semibold">
                          {o.priceFrom ? `от ${(o.priceFrom / 100).toLocaleString('ru-RU')} ₽` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Нет офферов</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
