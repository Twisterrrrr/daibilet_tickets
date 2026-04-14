import { SearchInput } from '@/components/shared/filters/SearchInput';
import { Button } from '@/components/ui/button';
import type { VenueImportSource, VenueCandidatesSortPreset } from '@/modules/venues/api/candidates';
import * as React from 'react';

export type CityOption = { slug: string; name: string };

type Props = {
  searchInput: string;
  onSearchInput: (v: string) => void;
  cities: CityOption[];
  citySlug: string;
  onCitySlug: (v: string) => void;
  importSource: '' | VenueImportSource;
  onImportSource: (v: '' | VenueImportSource) => void;
  sortPreset: VenueCandidatesSortPreset;
  onSortPreset: (v: VenueCandidatesSortPreset) => void;
  onlyNeedsReview: boolean;
  onOnlyNeedsReview: (v: boolean) => void;
  onlyWithDuplicates: boolean;
  onOnlyWithDuplicates: (v: boolean) => void;
  dupLoading: boolean;
  onResetFilters: () => void;
};

export function VenueCandidatesFilterBar({
  searchInput,
  onSearchInput,
  cities,
  citySlug,
  onCitySlug,
  importSource,
  onImportSource,
  sortPreset,
  onSortPreset,
  onlyNeedsReview,
  onOnlyNeedsReview,
  onlyWithDuplicates,
  onOnlyWithDuplicates,
  dupLoading,
  onResetFilters,
}: Props) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      <SearchInput
        placeholder="Поиск по названию или адресу…"
        value={searchInput}
        onChange={(e) => onSearchInput(e.target.value)}
        className="max-w-md"
      />
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Город
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
          value={citySlug}
          onChange={(e) => onCitySlug(e.target.value)}
        >
          <option value="">Все</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Порядок
        <select
          className="h-9 min-w-[220px] rounded-md border bg-background px-2 text-sm text-foreground"
          value={sortPreset}
          onChange={(e) => onSortPreset(e.target.value as VenueCandidatesSortPreset)}
        >
          <option value="newest">Сначала новые (по обновлению)</option>
          <option value="confidence_desc">Сначала самые уверенные</option>
          <option value="confidence_asc">Сначала наименее уверенные</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Источник импорта
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
          value={importSource}
          onChange={(e) => onImportSource(e.target.value as '' | VenueImportSource)}
        >
          <option value="">Все</option>
          <option value="TICKETSCLOUD">TICKETSCLOUD</option>
          <option value="TEPLOHOD">TEPLOHOD</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyNeedsReview} onChange={(e) => onOnlyNeedsReview(e.target.checked)} />
        Только needsReview
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyWithDuplicates} onChange={(e) => onOnlyWithDuplicates(e.target.checked)} />
        Только с возможными дублями
        {dupLoading ? <span className="text-xs text-muted-foreground">(проверка…)</span> : null}
      </label>
      <Button type="button" variant="outline" size="sm" onClick={onResetFilters}>
        Сбросить
      </Button>
    </div>
  );
}
