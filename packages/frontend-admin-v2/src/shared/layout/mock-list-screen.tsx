import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import type { AdminV2BlueprintSpec } from '@/shared/config/admin-v2-blueprints';
import { compareSortValues, SortableTableHead, type TableSortDirection } from '@/shared/ui/sortable-table-head';
import { DataTableShell } from '@/widgets/data-table-shell/data-table-shell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

import { IntegrationBlueprint } from './admin-v2-blueprint';
import { ListPageLayout } from './list-page-layout';

export interface MockColumnDef<T> {
  id: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  cell: (row: T) => ReactNode;
  /** Если задан — по клику на заголовок сортируем по этому значению */
  sortValue?: (row: T) => string | number;
}

export function MockListScreen<T>({
  title,
  subtitle,
  headerActions,
  headerGlyph,
  toolbar,
  columns,
  rows,
  getRowId,
  blueprint,
  intro,
}: {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  headerGlyph?: ReactNode;
  toolbar?: ReactNode;
  columns: MockColumnDef<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  blueprint?: AdminV2BlueprintSpec;
  /** Блок над таблицей (например вводный текст раздела) */
  intro?: ReactNode;
}) {
  const [sortColumnId, setSortColumnId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<TableSortDirection>('asc');

  const sortedRows = useMemo(() => {
    if (!sortColumnId) return rows;
    const col = columns.find((c) => c.id === sortColumnId);
    if (!col?.sortValue) return rows;
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => mult * compareSortValues(col.sortValue!(a), col.sortValue!(b)));
  }, [rows, columns, sortColumnId, sortDir]);

  const onHeaderClick = (colId: string, hasSort: boolean) => {
    if (!hasSort) return;
    if (sortColumnId !== colId) {
      setSortColumnId(colId);
      setSortDir('asc');
      return;
    }
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <ListPageLayout
      title={title}
      subtitle={subtitle}
      headerActions={headerActions}
      headerGlyph={headerGlyph}
      blueprint={blueprint ? <IntegrationBlueprint {...blueprint} /> : null}
    >
      {intro ? <div className="space-y-4">{intro}</div> : null}
      <DataTableShell toolbar={toolbar}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) =>
                c.sortValue ? (
                  <SortableTableHead
                    key={c.id}
                    label={c.header}
                    className={c.headerClassName}
                    active={sortColumnId === c.id}
                    direction={sortDir}
                    onToggle={() => onHeaderClick(c.id, true)}
                  />
                ) : (
                  <TableHead key={c.id} className={c.headerClassName}>
                    {c.header}
                  </TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((c) => (
                  <TableCell key={c.id} className={c.cellClassName}>
                    {c.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>
    </ListPageLayout>
  );
}
