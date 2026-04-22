import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

import { TableHead } from './table';

export type TableSortDirection = 'asc' | 'desc';

/** Сравнение значений для сортировки строк таблицы (строки, числа, даты). */
export function compareSortValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number' && !Number.isNaN(a) && !Number.isNaN(b)) {
    return a - b;
  }
  const na = typeof a === 'number' ? a : String(a).toLowerCase();
  const nb = typeof b === 'number' ? b : String(b).toLowerCase();
  if (na < nb) return -1;
  if (na > nb) return 1;
  return 0;
}

export function SortableTableHead({
  label,
  active,
  direction,
  onToggle,
  className,
  buttonClassName,
}: {
  label: string;
  active: boolean;
  direction: TableSortDirection;
  onToggle: () => void;
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        className={cn(
          '-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-left text-small font-semibold text-text-secondary transition-colors',
          'hover:bg-surface-alt hover:text-text-primary',
          active && 'text-text-primary',
          buttonClassName,
        )}
        onClick={onToggle}
      >
        <span>{label}</span>
        {active ? (
          direction === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-35" strokeWidth={2} aria-hidden />
        )}
      </button>
    </TableHead>
  );
}
