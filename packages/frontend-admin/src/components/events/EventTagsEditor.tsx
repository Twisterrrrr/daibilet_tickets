import { Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

type StructuralTagGroup = 'THEME' | 'AUDIENCE' | 'FORMAT';
type TagKind = 'STRUCTURAL' | 'POPULAR';

type Tag = {
  id: string;
  slug: string;
  name: string;
  tagKind?: TagKind | null;
  structuralGroup?: StructuralTagGroup | null;
  sortOrder?: number | null;
  isActive?: boolean;
};

type StructuralDraft = Record<StructuralTagGroup, string | null>;

const GROUP_LABELS: Record<StructuralTagGroup, string> = {
  THEME: 'Тема',
  AUDIENCE: 'Аудитория',
  FORMAT: 'Формат',
};

export function EventTagsEditor({ eventId, disabled }: { eventId: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [committedStructural, setCommittedStructural] = useState<StructuralDraft>({
    THEME: null,
    AUDIENCE: null,
    FORMAT: null,
  });
  const [committedPopular, setCommittedPopular] = useState<string[]>([]);

  const [draftStructural, setDraftStructural] = useState<StructuralDraft>(committedStructural);
  const [draftPopular, setDraftPopular] = useState<string[]>(committedPopular);

  const [structuralOptions, setStructuralOptions] = useState<Record<StructuralTagGroup, Tag[]>>({
    THEME: [],
    AUDIENCE: [],
    FORMAT: [],
  });
  const [popularOptions, setPopularOptions] = useState<Tag[]>([]);

  const [popularAddSlug, setPopularAddSlug] = useState<string>('');

  const structuralTagsFromDraft = useMemo(() => {
    return (Object.entries(draftStructural) as Array<[StructuralTagGroup, string | null]>)
      .map(([, slug]) => slug)
      .filter((s): s is string => !!s);
  }, [draftStructural]);

  const dirty = useMemo(() => {
    const committedStructuralList = Object.values(committedStructural).filter((s): s is string => !!s).sort();
    const draftStructuralList = Object.values(draftStructural).filter((s): s is string => !!s).sort();
    if (committedStructuralList.join(',') !== draftStructuralList.join(',')) return true;
    const committedPopularSorted = [...committedPopular].sort();
    const draftPopularSorted = [...draftPopular].sort();
    return committedPopularSorted.join(',') !== draftPopularSorted.join(',');
  }, [committedPopular, committedStructural, draftPopular, draftStructural]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [assigned, themeTags, audienceTags, formatTags, popularTags] = await Promise.all([
          adminApi.get<Tag[]>(`/admin/events/${eventId}/tags`),
          adminApi.get<Tag[]>(`/catalog/tags?kind=STRUCTURAL&group=THEME&activeOnly=true`),
          adminApi.get<Tag[]>(`/catalog/tags?kind=STRUCTURAL&group=AUDIENCE&activeOnly=true`),
          adminApi.get<Tag[]>(`/catalog/tags?kind=STRUCTURAL&group=FORMAT&activeOnly=true`),
          adminApi.get<Tag[]>(`/catalog/tags?kind=POPULAR&activeOnly=true`),
        ]);

        if (cancelled) return;

        const nextCommittedStructural: StructuralDraft = { THEME: null, AUDIENCE: null, FORMAT: null };
        const nextCommittedPopular: string[] = [];

        for (const t of assigned) {
          if (t.tagKind === 'STRUCTURAL' && t.structuralGroup) {
            nextCommittedStructural[t.structuralGroup] = t.slug;
          } else if (t.tagKind === 'POPULAR') {
            nextCommittedPopular.push(t.slug);
          }
        }

        setCommittedStructural(nextCommittedStructural);
        setCommittedPopular(Array.from(new Set(nextCommittedPopular)));

        setDraftStructural(nextCommittedStructural);
        setDraftPopular(Array.from(new Set(nextCommittedPopular)));

        setStructuralOptions({
          THEME: themeTags,
          AUDIENCE: audienceTags,
          FORMAT: formatTags,
        });
        setPopularOptions(popularTags);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Ошибка загрузки тегов';
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const structuralTags = structuralTagsFromDraft;
      const popularTags = draftPopular;
      await adminApi.put(`/admin/events/${eventId}/tags`, {
        structuralTags,
        popularTags,
      });

      // refresh committed state
      const assigned = await adminApi.get<Tag[]>(`/admin/events/${eventId}/tags`);
      const nextCommittedStructural: StructuralDraft = { THEME: null, AUDIENCE: null, FORMAT: null };
      const nextCommittedPopular: string[] = [];
      for (const t of assigned) {
        if (t.tagKind === 'STRUCTURAL' && t.structuralGroup) {
          nextCommittedStructural[t.structuralGroup] = t.slug;
        } else if (t.tagKind === 'POPULAR') {
          nextCommittedPopular.push(t.slug);
        }
      }
      const nextPopularUnique = Array.from(new Set(nextCommittedPopular));
      setCommittedStructural(nextCommittedStructural);
      setCommittedPopular(nextPopularUnique);
      setDraftStructural(nextCommittedStructural);
      setDraftPopular(nextPopularUnique);
      toast.success('Теги события сохранены');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка сохранения тегов');
    } finally {
      setSaving(false);
    }
  };

  const removePopular = (slug: string) => {
    setDraftPopular((p) => p.filter((x) => x !== slug));
  };

  const getTagLabel = (slug: string) => {
    const fromPopular = popularOptions.find((t) => t.slug === slug);
    if (fromPopular) return fromPopular.name;
    for (const group of Object.keys(structuralOptions) as StructuralTagGroup[]) {
      const fromStructural = structuralOptions[group].find((t) => t.slug === slug);
      if (fromStructural) return fromStructural.name;
    }
    return slug;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Теги</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-base">Теги</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Теги события</CardTitle>
        <p className="text-xs text-muted-foreground pt-1">
          Для публикации важны категория и подкатегории (отдельный блок выше). Теги — дополнительный слой
          (обогащение / маркетинг / совместимость); отсутствие тегов не блокирует публикацию.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Structural layer (optional) */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Label className="text-sm">Структурные теги (необязательно)</Label>
          </div>
          {(Object.keys(GROUP_LABELS) as StructuralTagGroup[]).map((group) => {
            const selected = draftStructural[group];
            const options = structuralOptions[group] ?? [];
            return (
              <div key={group} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm">{GROUP_LABELS[group]}</Label>
                  {selected ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{getTagLabel(selected)}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={saving || disabled}
                        onClick={() => setDraftStructural((d) => ({ ...d, [group]: null }))}
                        aria-label={`Убрать ${GROUP_LABELS[group]} тег`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Нет</span>
                  )}
                </div>
                <Select
                  value={selected ?? '__none__'}
                  onValueChange={(v) => setDraftStructural((d) => ({ ...d, [group]: v === '__none__' ? null : v }))}
                  disabled={saving || disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тег" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Без тега</SelectItem>
                    {options
                      .slice()
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                      .map((t) => (
                        <SelectItem key={t.id} value={t.slug}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>

        {/* Popular layer */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Label className="text-sm">POPULAR</Label>
          </div>

          {draftPopular.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {draftPopular.map((slug) => (
                <div key={slug} className="flex items-center gap-2">
                  <Badge variant="secondary">{getTagLabel(slug)}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={saving || disabled}
                    onClick={() => removePopular(slug)}
                    aria-label="Удалить popular тег"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Нет selected popular тегов</span>
          )}

          <div className="space-y-2">
            <Label className="text-sm">Добавить popular тег</Label>
            <div className="flex items-center gap-3">
              <Select value={popularAddSlug || '__none__'} onValueChange={setPopularAddSlug} disabled={saving || disabled}>
                <SelectTrigger className="w-[320px]">
                  <SelectValue placeholder="Выберите популярный тег" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{'— Выберите —'}</SelectItem>
                  {popularOptions.map((t) => (
                    <SelectItem key={t.id} value={t.slug} disabled={draftPopular.includes(t.slug)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                disabled={!popularAddSlug || popularAddSlug === '__none__' || saving || disabled}
                onClick={() => {
                  if (!popularAddSlug || popularAddSlug === '__none__') return;
                  setDraftPopular((p) => (p.includes(popularAddSlug) ? p : [...p, popularAddSlug]));
                  setPopularAddSlug('');
                }}
              >
                Добавить
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" disabled={saving || disabled || !dirty} onClick={() => {
            setDraftStructural(committedStructural);
            setDraftPopular(committedPopular);
          }}>
            Отменить
          </Button>
          <Button type="button" disabled={saving || disabled || !dirty} onClick={handleSave}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

