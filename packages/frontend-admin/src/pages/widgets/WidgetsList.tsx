import { ColumnDef } from '@tanstack/react-table';
import { Copy, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, SortableHeader } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';

interface Provider {
  id: string;
  kind: string;
  name: string;
  baseUrl: string | null;
  isActive: boolean;
}

interface WidgetItem {
  id: string;
  providerId: string;
  externalId: string;
  title: string | null;
  url: string | null;
  isActive: boolean;
  provider: Provider;
}

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} скопирован`),
    () => toast.error('Не удалось скопировать'),
  );
};

const columns: ColumnDef<WidgetItem>[] = [
  {
    accessorKey: 'externalId',
    header: ({ column }) => <SortableHeader column={column}>Widget ID</SortableHeader>,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{row.original.externalId}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(row.original.externalId, 'Widget ID');
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    ),
  },
  {
    accessorKey: 'title',
    header: 'Название',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.title || '—'}</span>
    ),
  },
  {
    accessorKey: 'provider',
    header: 'Провайдер',
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.provider?.name ?? '—'}</Badge>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Активен',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'secondary'}>
        {row.original.isActive ? 'Да' : 'Нет'}
      </Badge>
    ),
  },
];

export function WidgetsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<WidgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [providerId, setProviderId] = useState<string>('');
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    adminApi
      .get<Provider[]>('/admin/widgets/providers')
      .then(setProviders)
      .catch(() => setProviders([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (providerId) params.set('providerId', providerId);
    if (search) params.set('search', search);

    adminApi
      .get<{ items: WidgetItem[] } | WidgetItem[]>(`/admin/widgets${params.toString() ? `?${params}` : ''}`)
      .then((res) => {
        const items = Array.isArray(res) ? res : (res as { items?: WidgetItem[] }).items ?? [];
        setData(items);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [providerId, search]);

  const handleRowClick = (item: WidgetItem) => {
    navigate(`/widgets/${item.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Виджеты Teplohod</h1>
          <p className="text-muted-foreground">Справочник виджетов и привязок для teplohod.info</p>
        </div>
        <Button asChild>
          <Link to="/widgets/new">
            <Plus className="mr-2 h-4 w-4" />
            Создать
          </Link>
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Фильтры</CardTitle>
          <CardDescription>Поиск по widget ID или названию</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <select
              value={providerId || '__all__'}
              onChange={(e) => setProviderId(e.target.value === '__all__' ? '' : e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="__all__">Все провайдеры</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Список виджетов</CardTitle>
          <CardDescription>
            {data.length} {data.length === 1 ? 'виджет' : data.length < 5 ? 'виджета' : 'виджетов'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            onRowClick={handleRowClick}
            loading={loading}
            emptyText="Нет виджетов. Создайте провайдера TEPLOHOD и добавьте виджеты."
          />
        </CardContent>
      </Card>
    </div>
  );
}
