import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { adminApi } from '@/api/client';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  before: any;
  after: any;
  createdAt: string;
}

const ACTION_VARIANTS: Record<string, 'success' | 'default' | 'destructive' | 'secondary'> = {
  CREATE: 'success',
  UPDATE: 'default',
  DELETE: 'destructive',
};

const ENTITY_OPTIONS = [
  { value: '__all__', label: 'Все сущности' },
  { value: 'City', label: 'City' },
  { value: 'Event', label: 'Event' },
  { value: 'Tag', label: 'Tag' },
  { value: 'LandingPage', label: 'Landing' },
  { value: 'ComboPage', label: 'Combo' },
  { value: 'Article', label: 'Article' },
  { value: 'UpsellItem', label: 'Upsell' },
  { value: 'Settings', label: 'Settings' },
];

const ACTION_OPTIONS = [
  { value: '__all__', label: 'Все действия' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
];

export function AuditLogPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '30');
    if (entity) params.set('entity', entity);
    if (action) params.set('action', action);

    adminApi
      .get(`/admin/audit?${params}`)
      .then((data: any) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, entity, action]);

  const columns: ColumnDef<AuditEntry>[] = [
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <SortableHeader column={column}>Дата</SortableHeader>,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleString('ru-RU')}
        </span>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Действие',
      cell: ({ row }) => (
        <Badge
          variant={ACTION_VARIANTS[row.original.action] ?? 'secondary'}
        >
          {row.original.action}
        </Badge>
      ),
    },
    {
      accessorKey: 'entity',
      header: 'Сущность',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.entity}</span>
      ),
    },
    {
      accessorKey: 'entityId',
      header: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.entityId.substring(0, 8)}...
        </span>
      ),
    },
    {
      accessorKey: 'userId',
      header: 'User',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.userId.substring(0, 8)}...
        </span>
      ),
    },
    {
      id: 'details',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEntry(row.original);
          }}
        >
          Детали
        </Button>
      ),
    },
  ];

  const totalPages = Math.ceil(total / 30) || 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Журнал аудита</h1>
        <p className="text-muted-foreground">
          История изменений, всего записей: {total}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Фильтрация по сущности и действию</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={entity || '__all__'}
              onValueChange={(v) => {
                setEntity(v === '__all__' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Все сущности" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={action || '__all__'}
              onValueChange={(v) => {
                setAction(v === '__all__' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Все действия" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground">Всего: {total}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={items}
            loading={loading}
            emptyText="Нет записей"
            pageSize={30}
          />

          {total > 30 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Стр. {page} из {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                >
                  Далее
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Детали записи</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedEntry.before != null && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Before</p>
                  <ScrollArea className="h-40 rounded-md border bg-muted/30 p-3">
                    <pre className="font-mono text-[10px] text-muted-foreground">
                      {JSON.stringify(selectedEntry.before, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">After / Data</p>
                <ScrollArea className="h-40 rounded-md border bg-muted/30 p-3">
                  <pre className="font-mono text-[10px] text-muted-foreground">
                    {JSON.stringify(selectedEntry.after, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
