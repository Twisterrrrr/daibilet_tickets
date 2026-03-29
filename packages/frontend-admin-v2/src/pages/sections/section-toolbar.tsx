import type { Dispatch, SetStateAction } from 'react';

import { FilterBar, FilterField } from '@/shared/layout/filter-bar';
import { SearchInput } from '@/shared/ui/search-input';

export function listPageToolbarSearch(
  placeholder: string,
  value: string,
  setValue: Dispatch<SetStateAction<string>>,
) {
  return (
    <FilterBar>
      <FilterField label="Поиск">
        <SearchInput placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
      </FilterField>
    </FilterBar>
  );
}
