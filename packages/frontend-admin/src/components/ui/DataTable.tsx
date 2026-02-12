import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyText?: string;
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  onRowClick,
  loading,
  emptyText = 'Нет данных',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        Загрузка...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${col.className || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((item, i) => (
            <tr
              key={(item as any).id || i}
              onClick={() => onRowClick?.(item)}
              className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                  {col.render ? col.render(item) : String((item as any)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
