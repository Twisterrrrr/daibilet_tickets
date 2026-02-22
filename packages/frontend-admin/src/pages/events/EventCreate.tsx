import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { EventTemplateFields } from './EventTemplateFields';

// ─── Types ──────────────────────────────────────────────

interface CityOption {
  id: string;
  slug: string;
  name: string;
}

const CATEGORY_OPTIONS = [
  { value: 'EXCURSION', label: 'Экскурсии' },
  { value: 'MUSEUM', label: 'Музеи' },
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

// ─── Page ───────────────────────────────────────────────

export function EventCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [cities, setCities] = useState<CityOption[]>([]);

  // Step 1 — Event content
  const [title, setTitle] = useState('');
  const [cityId, setCityId] = useState('');
  const [category, setCategory] = useState('EXCURSION');
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [audience, setAudience] = useState('ALL');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [address, setAddress] = useState('');
  const [minAge, setMinAge] = useState('');
  const [templateData, setTemplateData] = useState<Record<string, unknown>>({});

  // Step 2 — First offer (optional)
  const [skipOffer, setSkipOffer] = useState(false);
  const [purchaseType, setPurchaseType] = useState('REQUEST');
  const [deeplink, setDeeplink] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('');
  const [availabilityMode, setAvailabilityMode] = useState('');
  const [badge, setBadge] = useState('');

  // Load cities
  useEffect(() => {
    adminApi
      .get<any>('/admin/cities')
      .then((res: any) => {
        const list = res.items || res;
        setCities(Array.isArray(list) ? list : []);
      })
      .catch((e) => console.error('Load cities failed:', e));
  }, []);

  const canGoStep2 = title.trim() && cityId && category;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload: any = {
        title,
        cityId,
        category,
        subcategories,
        audience,
        description: description || undefined,
        shortDescription: shortDescription || undefined,
        imageUrl: imageUrl || undefined,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        address: address || undefined,
        minAge: minAge ? Number(minAge) : undefined,
        templateData: Object.keys(templateData).length > 0 ? templateData : undefined,
      };

      if (!skipOffer) {
        payload.offer = {
          source: 'MANUAL',
          purchaseType,
          deeplink: deeplink || undefined,
          priceFrom: priceFrom ? Math.round(Number(priceFrom) * 100) : undefined,
          commissionPercent: commissionPercent ? Number(commissionPercent) : undefined,
          availabilityMode: availabilityMode || undefined,
          badge: badge || undefined,
        };
      }

      const result = await adminApi.post<{ event: { id: string } }>('/admin/events', payload);
      toast.success('Событие создано');
      navigate(`/events/${result.event.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка создания');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/events')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Создать событие</h1>
          <p className="text-sm text-muted-foreground">Шаг {step} из 2</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-2">
        <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
      </div>

      {/* Step 1: Event content */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Контент и SEO</CardTitle>
            <CardDescription>Основные данные о событии</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Прогулка по Неве..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Город *</Label>
                <Select value={cityId} onValueChange={setCityId}>
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
                <Label>Категория *</Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    setCategory(v);
                    setSubcategories([]);
                    setTemplateData({});
                  }}
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
            </div>

            {/* Subcategories */}
            <div className="space-y-2">
              <Label>Подкатегории</Label>
              <div className="flex flex-wrap gap-2 rounded-md border p-3">
                {(SUBCATEGORY_OPTIONS[category] || []).map((opt) => {
                  const isChecked = subcategories.includes(opt.value);
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
                          setSubcategories((prev) =>
                            e.target.checked ? [...prev, opt.value] : prev.filter((s) => s !== opt.value),
                          );
                        }}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Аудитория</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Для всех</SelectItem>
                    <SelectItem value="KIDS">Детям</SelectItem>
                    <SelectItem value="FAMILY">Семейный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Длительность (мин.)</Label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL изображения</Label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Мин. возраст</Label>
                <Input type="number" value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Адрес</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Набережная Макарова, 2"
              />
            </div>

            <div className="space-y-2">
              <Label>Краткое описание</Label>
              <Input
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Для каталога / SEO description"
              />
            </div>

            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Полное описание события..."
              />
            </div>

            <EventTemplateFields
              category={category}
              subcategories={subcategories}
              templateData={templateData}
              onChange={setTemplateData}
            />

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canGoStep2}>
                Далее
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: First offer */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Первый оффер</CardTitle>
            <CardDescription>Настройка способа покупки / заявки</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="skipOffer"
                checked={skipOffer}
                onChange={(e) => setSkipOffer(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="skipOffer" className="cursor-pointer">
                Пропустить (создать без оффера)
              </Label>
            </div>

            {!skipOffer && (
              <>
                <div className="space-y-2">
                  <Label>Тип покупки</Label>
                  <Select value={purchaseType} onValueChange={setPurchaseType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REQUEST">Заявка на подтверждение</SelectItem>
                      <SelectItem value="REDIRECT">Внешняя ссылка</SelectItem>
                      <SelectItem value="WIDGET">Виджет (TC и др.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(purchaseType === 'REDIRECT' || purchaseType === 'REQUEST') && (
                  <div className="space-y-2">
                    <Label>URL / Deep Link</Label>
                    <Input value={deeplink} onChange={(e) => setDeeplink(e.target.value)} placeholder="https://..." />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Цена от (руб.)</Label>
                    <Input
                      type="number"
                      value={priceFrom}
                      onChange={(e) => setPriceFrom(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Комиссия %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Доступность</Label>
                    <Select
                      value={availabilityMode || '__none__'}
                      onValueChange={(v) => setAvailabilityMode(v === '__none__' ? '' : v)}
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
                    <Select value={badge || '__none__'} onValueChange={(v) => setBadge(v === '__none__' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Без бейджа" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Без бейджа</SelectItem>
                        <SelectItem value="optimal">Оптимальный</SelectItem>
                        <SelectItem value="cheapest">Дешевле</SelectItem>
                        <SelectItem value="fastest">Быстрее</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                <Check className="mr-2 h-4 w-4" />
                {saving ? 'Создание...' : 'Создать событие'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
