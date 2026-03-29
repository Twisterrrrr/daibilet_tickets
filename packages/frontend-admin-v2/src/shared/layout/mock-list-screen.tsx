import type { ReactNode } from 'react';

import { DataTableShell } from '@/widgets/data-table-shell/data-table-shell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

import { ListPageLayout } from './list-page-layout';

export interface MockColumnDef<T> {
  id: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  cell: (row: T) => ReactNode;
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
}: {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  headerGlyph?: ReactNode;
  toolbar?: ReactNode;
  columns: MockColumnDef<T>[];
  rows: T[];
  getRowId: (row: T) => string;
}) {
  return (
    <ListPageLayout title={title} subtitle={subtitle} headerActions={headerActions} headerGlyph={headerGlyph}>
      <DataTableShell toolbar={toolbar}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.id} className={c.headerClassName}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
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
