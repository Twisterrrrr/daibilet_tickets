import * as React from 'react';

import { Button } from '@/components/ui/button';
import { assignEventSubcategories, getEvent, patchEventOverride, setEventTags } from '@/modules/events/api/events';
import type { EventDetailDto } from '@/modules/events/types';
import { listEventPrimarySubcategories, listEventSecondarySubcategories, listTags } from '@/modules/taxonomy/api/taxonomy';
import type { SubcategoryDto, TagDto } from '@/modules/taxonomy/types';

const EVENT_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'EXCURSION', label: 'Экскурсии' },
  { value: 'MUSEUM', label: 'Музеи и выставки' },
  { value: 'EVENT', label: 'Мероприятия' },
  { value: 'ACTIVITY', label: 'Активный отдых' },
  { value: 'ENTERTAINMENT', label: 'Развлечения' },
];

type StructuralGroup = 'THEME' | 'AUDIENCE';

const STRUCTURAL_GROUP_LABEL: Record<StructuralGroup, string> = {
  THEME: 'Тема',
  AUDIENCE: 'Аудитория',
};

const LANGUAGE_SLUGS = ['ru', 'en', 'bilingual'] as const;
type LanguageSlug = (typeof LANGUAGE_SLUGS)[number];

function effectiveCategory(event: EventDetailDto): string {
  return String(event.override?.category ?? event.category ?? '').trim();
}

function subcategoryCodesFromEvent(event: EventDetailDto): { primaryCode: string; secondary: [string, string] } {
  const links = event.subcategoryLinks ?? [];
  const primary = links.find((link) => (link.subcategory?.layer ?? '').toUpperCase() === 'PRIMARY')?.subcategory;
  const secondary = links
    .filter((link) => (link.subcategory?.layer ?? '').toUpperCase() === 'SECONDARY')
    .map((link) => (link.subcategory?.code ?? link.subcategory?.slug ?? '').trim())
    .filter(Boolean);

  return {
    primaryCode: (primary?.code ?? primary?.slug ?? '').trim(),
    secondary: [secondary[0] ?? '', secondary[1] ?? ''],
  };
}

function tagSlugsFromEvent(event: EventDetailDto): {
  structural: Record<StructuralGroup, string>;
  popular: string[];
  language: LanguageSlug | '';
} {
  const structural: Record<StructuralGroup, string> = { THEME: '', AUDIENCE: '' };
  const popular: string[] = [];
  let language: LanguageSlug | '' = '';

  for (const link of event.tags ?? []) {
    const tag = link.tag;
    if (!tag) continue;

    const kind = (tag.tagKind ?? '').toUpperCase();
    if (kind === 'POPULAR') {
      if ((LANGUAGE_SLUGS as readonly string[]).includes(tag.slug)) {
        language = tag.slug as LanguageSlug;
      } else {
        popular.push(tag.slug);
      }
      continue;
    }

    if (kind !== 'STRUCTURAL') continue;
    const group = (tag.structuralGroup ?? '').toUpperCase() as StructuralGroup;
    if (group === 'THEME' || group === 'AUDIENCE') structural[group] = tag.slug;
  }

  return { structural, popular: Array.from(new Set(popular)), language };
}

function partitionTagsForEventEditor(rows: TagDto[]) {
  const byGroup: Record<StructuralGroup, TagDto[]> = { THEME: [], AUDIENCE: [] };
  const popular: TagDto[] = [];

  for (const tag of rows) {
    const kind = (tag.tagKind ?? '').toUpperCase();
    if (kind === 'POPULAR') {
      popular.push(tag);
      continue;
    }

    if (kind !== 'STRUCTURAL') continue;
    const group = (tag.structuralGroup ?? '').toUpperCase() as StructuralGroup;
    if (group === 'THEME' || group === 'AUDIENCE') byGroup[group].push(tag);
  }

  for (const group of Object.keys(byGroup) as StructuralGroup[]) {
    byGroup[group].sort((a, b) => (a.name ?? a.slug).localeCompare(b.name ?? b.slug, 'ru'));
  }
  popular.sort((a, b) => (a.name ?? a.slug).localeCompare(b.name ?? b.slug, 'ru'));

  return { byGroup, popular };
}

export type EventClassificationFormProps = {
  event: EventDetailDto;
  onUpdated: (next: EventDetailDto) => void;
};

export function EventClassificationForm({ event, onUpdated }: EventClassificationFormProps) {
  const [categoryDraft, setCategoryDraft] = React.useState(() => effectiveCategory(event));
  const [primaryCode, setPrimaryCode] = React.useState(() => subcategoryCodesFromEvent(event).primaryCode);
  const [secondary1, setSecondary1] = React.useState(() => subcategoryCodesFromEvent(event).secondary[0]);
  const [secondary2, setSecondary2] = React.useState(() => subcategoryCodesFromEvent(event).secondary[1]);

  const tagInit = React.useMemo(() => tagSlugsFromEvent(event), [event]);
  const [slugTheme, setSlugTheme] = React.useState(() => tagInit.structural.THEME);
  const [slugAudience, setSlugAudience] = React.useState(() => tagInit.structural.AUDIENCE);
  const [popularSlugs, setPopularSlugs] = React.useState<string[]>(() => [...tagInit.popular]);
  const [languageSlug, setLanguageSlug] = React.useState<LanguageSlug | ''>(() => tagInit.language);

  const [primaryOptions, setPrimaryOptions] = React.useState<SubcategoryDto[]>([]);
  const [secondaryOptions, setSecondaryOptions] = React.useState<SubcategoryDto[]>([]);
  const [tagOptions, setTagOptions] = React.useState<{ byGroup: Record<StructuralGroup, TagDto[]>; popular: TagDto[] } | null>(null);
  const [loadingRefs, setLoadingRefs] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');

  React.useEffect(() => {
    setCategoryDraft(effectiveCategory(event));
    const codes = subcategoryCodesFromEvent(event);
    setPrimaryCode(codes.primaryCode);
    setSecondary1(codes.secondary[0]);
    setSecondary2(codes.secondary[1]);
    const tags = tagSlugsFromEvent(event);
    setSlugTheme(tags.structural.THEME);
    setSlugAudience(tags.structural.AUDIENCE);
    setPopularSlugs([...tags.popular]);
    setLanguageSlug(tags.language);
  }, [event]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRefs(true);
      try {
        const category = categoryDraft.trim();
        const [primary, secondary, tagsPage] = await Promise.all([
          category ? listEventPrimarySubcategories({ eventCategory: category }) : Promise.resolve([] as SubcategoryDto[]),
          listEventSecondarySubcategories(),
          listTags({ limit: 500, page: 1 }),
        ]);

        if (cancelled) return;
        setPrimaryOptions(primary);
        setSecondaryOptions(secondary);
        setTagOptions(partitionTagsForEventEditor(tagsPage.items ?? []));
      } catch {
        if (!cancelled) setSaveError('Не удалось загрузить справочники taxonomy');
      } finally {
        if (!cancelled) setLoadingRefs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [categoryDraft]);

  const togglePopular = React.useCallback((slug: string) => {
    setPopularSlugs((prev) => (prev.includes(slug) ? prev.filter((item) => item !== slug) : [...prev, slug]));
  }, []);

  const onSave = async () => {
    setSaveError('');

    const category = categoryDraft.trim();
    if (!category) {
      setSaveError('Выберите категорию события');
      return;
    }

    const primary = primaryCode.trim();
    if (!primary) {
      setSaveError('Выберите PRIMARY-подкатегорию');
      return;
    }

    const secondaryCodes = [secondary1, secondary2].map((value) => value.trim()).filter(Boolean);
    const structuralTags = [slugTheme, slugAudience].map((value) => value.trim()).filter(Boolean);
    const popularTags = [...popularSlugs, languageSlug || null]
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean);

    setSaving(true);
    try {
      if (category !== effectiveCategory(event)) {
        await patchEventOverride(event.id, { category });
      }

      await assignEventSubcategories(event.id, { primaryCode: primary, secondaryCodes });
      await setEventTags(event.id, { structuralTags, popularTags });

      const next = await getEvent(event.id);
      onUpdated(next);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Не удалось сохранить классификацию');
    } finally {
      setSaving(false);
    }
  };

  const selectCls =
    'border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">Редактирование классификации, подкатегорий и тегов</div>
        <Button size="sm" type="button" disabled={saving || loadingRefs} onClick={() => void onSave()}>
          {saving ? 'Сохранение...' : 'Сохранить классификацию'}
        </Button>
      </div>

      {saveError ? <div className="text-sm text-destructive">{saveError}</div> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <SelectField label="Категория" value={categoryDraft} onChange={setCategoryDraft} options={EVENT_CATEGORIES} emptyLabel="- не выбрано -" />

        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">PRIMARY</div>
          <select className={selectCls} value={primaryCode} onChange={(event) => setPrimaryCode(event.target.value)} disabled={!categoryDraft.trim()}>
            <option value="">{categoryDraft.trim() ? '- выберите -' : 'Сначала категория'}</option>
            {primaryOptions.map((item) => (
              <option key={item.id} value={(item.code ?? '').trim() || item.slug}>
                {(item.nameRu ?? item.slug) + (item.code ? ` · ${item.code}` : '')}
              </option>
            ))}
          </select>
        </div>

        <SubcategorySelect label="SECONDARY #1" value={secondary1} onChange={setSecondary1} options={secondaryOptions} selectClassName={selectCls} />
        <SubcategorySelect label="SECONDARY #2" value={secondary2} onChange={setSecondary2} options={secondaryOptions} selectClassName={selectCls} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Язык события</div>
          <select
            className={selectCls}
            value={languageSlug}
            onChange={(event) => setLanguageSlug((event.target.value || '') as LanguageSlug | '')}
            disabled={!tagOptions}
          >
            <option value="">- не выбрано -</option>
            {(tagOptions?.popular ?? [])
              .filter((tag) => (LANGUAGE_SLUGS as readonly string[]).includes(tag.slug))
              .map((tag) => (
                <option key={tag.id} value={tag.slug}>
                  {tag.name ?? tag.slug}
                </option>
              ))}
          </select>
          <div className="text-[11px] text-muted-foreground">Язык хранится как POPULAR-тег; формат лучше задавать через SECONDARY-подкатегории.</div>
        </div>

        {(Object.keys(STRUCTURAL_GROUP_LABEL) as StructuralGroup[]).map((group) => {
          const options = tagOptions?.byGroup[group] ?? [];
          const value = group === 'THEME' ? slugTheme : slugAudience;
          const setValue = group === 'THEME' ? setSlugTheme : setSlugAudience;

          return (
            <div key={group} className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">{STRUCTURAL_GROUP_LABEL[group]}</div>
              <select className={selectCls} value={value} onChange={(event) => setValue(event.target.value)}>
                <option value="">- нет -</option>
                {options.map((tag) => (
                  <option key={tag.id} value={tag.slug}>
                    {(tag.name ?? tag.slug) + ` · ${tag.slug}`}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Популярные теги</div>
        <div className="max-h-40 overflow-auto rounded-md border border-border bg-secondary/20 p-2">
          {(tagOptions?.popular ?? []).filter((tag) => !(LANGUAGE_SLUGS as readonly string[]).includes(tag.slug)).length ? (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {tagOptions!.popular
                .filter((tag) => !(LANGUAGE_SLUGS as readonly string[]).includes(tag.slug))
                .map((tag) => (
                  <label key={tag.id} className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-border"
                      checked={popularSlugs.includes(tag.slug)}
                      onChange={() => togglePopular(tag.slug)}
                    />
                    <span>
                      {tag.name ?? tag.slug} <span className="font-mono text-muted-foreground">({tag.slug})</span>
                    </span>
                  </label>
                ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">{loadingRefs ? 'Загрузка...' : 'Нет POPULAR-тегов в справочнике'}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  emptyLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  emptyLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <select
        className="border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SubcategorySelect({
  label,
  value,
  onChange,
  options,
  selectClassName,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SubcategoryDto[];
  selectClassName: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <select className={selectClassName} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">- нет -</option>
        {options.map((item) => (
          <option key={item.id} value={(item.code ?? '').trim() || item.slug}>
            {(item.nameRu ?? item.slug) + (item.code ? ` · ${item.code}` : '')}
          </option>
        ))}
      </select>
    </div>
  );
}
