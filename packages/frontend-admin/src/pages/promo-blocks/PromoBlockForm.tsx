import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PromoBlockFormData } from '@/api/promo-blocks';
import type { PromoCollection } from '@/api/promo-collections';

const ICON_KEYS = [
  { value: 'ship', label: 'Ship' }, { value: 'sparkles', label: 'Sparkles' },
  { value: 'party-popper', label: 'Party Popper' }, { value: 'snowflake', label: 'Snowflake' },
  { value: 'heart', label: 'Heart' }, { value: 'utensils-crossed', label: 'Utensils' },
  { value: 'umbrella', label: 'Umbrella' }, { value: 'baby', label: 'Baby' },
];

interface PromoBlockFormProps {
  form: PromoBlockFormData;
  onChange: (data: Partial<PromoBlockFormData>) => void;
  collections?: PromoCollection[];
}

export function PromoBlockForm({ form, onChange, collections = [] }: PromoBlockFormProps) {
  const set = (k: keyof PromoBlockFormData, v: unknown) => onChange({ [k]: v });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Основные</h3>
        <div className="space-y-2">
          <Label>Режим контента</Label>
          <Select value={form.contentMode ?? 'LINK_ONLY'} onValueChange={(v) => set('contentMode', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LINK_ONLY">Простая ссылка (LINK_ONLY)</SelectItem>
              <SelectItem value="COLLECTION">Коллекция</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (kebab-case)</Label>
            <Input id="slug" value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="maslenitsa" />
          </div>
          {form.contentMode === 'COLLECTION' ? (
            <div className="space-y-2">
              <Label>Коллекция</Label>
              <Select
                value={form.collectionId ?? ''}
                onValueChange={(v) => set('collectionId', v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title} ({c.slug})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="href">Ссылка</Label>
              <Input id="href" value={form.href ?? ''} onChange={(e) => set('href', e.target.value)} placeholder="/events?tag=maslenitsa" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Название</Label>
          <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Масленица" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Описание</Label>
          <Textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Гастро-экскурсии" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetCitySlugs">Таргетинг по городам (slug через запятую)</Label>
          <Input
            id="targetCitySlugs"
            value={Array.isArray(form.targetCitySlugs) ? form.targetCitySlugs.join(', ') : ''}
            onChange={(e) => {
              const val = e.target.value.trim();
              const arr = val ? val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
              set('targetCitySlugs', arr);
            }}
            placeholder="saint-petersburg, moscow (пусто = всем)"
          />
          <p className="text-xs text-muted-foreground">
            Пусто — блок показывается всем. Укажите slug городов — только им.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Статус</Label>
          <Select value={form.isActive ? 'true' : 'false'} onValueChange={(v) => set('isActive', v === 'true')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Активен</SelectItem>
              <SelectItem value="false">Выключен</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Период</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startsAt">Начало</Label>
            <Input id="startsAt" type="datetime-local" value={form.startsAt ? form.startsAt.slice(0, 16) : ''} onChange={(e) => set('startsAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endsAt">Конец</Label>
            <Input id="endsAt" type="datetime-local" value={form.endsAt ? form.endsAt.slice(0, 16) : ''} onChange={(e) => set('endsAt', e.target.value ? new Date(e.target.value).toISOString() : undefined)} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Порядок</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="priority">Приоритет</Label>
            <Input id="priority" type="number" value={form.priority ?? 0} onChange={(e) => set('priority', Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Порядок сортировки</Label>
            <Input id="sortOrder" type="number" value={form.sortOrder ?? 0} onChange={(e) => set('sortOrder', Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Иконка</h3>
        <div className="space-y-2">
          <Label>Источник</Label>
          <Select value={form.iconSource ?? 'LIBRARY'} onValueChange={(v) => set('iconSource', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LIBRARY">Библиотека</SelectItem>
              <SelectItem value="SVG">Свой SVG</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.iconSource === 'SVG' ? (
          <div className="space-y-2">
            <Label htmlFor="iconSvg">SVG</Label>
            <Textarea id="iconSvg" value={form.iconSvg ?? ''} onChange={(e) => set('iconSvg', e.target.value)} rows={5} placeholder="<svg>...</svg>" className="font-mono text-sm" />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="iconKey">Иконка</Label>
            <Select value={form.iconKey ?? ''} onValueChange={(v) => set('iconKey', v)}>
              <SelectTrigger id="iconKey"><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                {ICON_KEYS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Фон</h3>
        <div className="space-y-2">
          <Label>Режим</Label>
          <Select value={form.bgMode ?? 'GRADIENT'} onValueChange={(v) => set('bgMode', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SOLID">Сплошной</SelectItem>
              <SelectItem value="GRADIENT">Градиент</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.bgMode === 'SOLID' ? (
          <div className="space-y-2">
            <Label htmlFor="bgColor">Цвет</Label>
            <div className="flex gap-2">
              <Input id="bgColor" type="color" value={form.bgColor ?? '#6366f1'} onChange={(e) => set('bgColor', e.target.value)} className="h-10 w-14 cursor-pointer p-1" />
              <Input value={form.bgColor ?? ''} onChange={(e) => set('bgColor', e.target.value)} placeholder="#6366f1" />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>От</Label>
              <div className="flex gap-2">
                <Input type="color" value={form.gradientFrom ?? '#f59e0b'} onChange={(e) => set('gradientFrom', e.target.value)} className="h-10 w-14 cursor-pointer p-1" />
                <Input value={form.gradientFrom ?? ''} onChange={(e) => set('gradientFrom', e.target.value)} placeholder="#f59e0b" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>До</Label>
              <div className="flex gap-2">
                <Input type="color" value={form.gradientTo ?? '#ea580c'} onChange={(e) => set('gradientTo', e.target.value)} className="h-10 w-14 cursor-pointer p-1" />
                <Input value={form.gradientTo ?? ''} onChange={(e) => set('gradientTo', e.target.value)} placeholder="#ea580c" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
