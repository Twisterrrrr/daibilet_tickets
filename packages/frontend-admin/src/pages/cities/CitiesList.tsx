import { Building2, Calendar, Megaphone, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState, ErrorState, PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CityItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isFeatured: boolean;
  isActive: boolean;
  _count?: {
    events?: number;
    landingPages?: number;
    comboPages?: number;
  };
}

export function CitiesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminApi
      .get<CityItem[] | { items: CityItem[] }>('/admin/cities')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as { items: CityItem[] }).items;
        setItems(list ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleFeatured = async (id: string, value: boolean) => {
    const prev = items;
    setItems((curr) => curr.map((c) => (c.id === id ? { ...c, isFeatured: value } : c)));
    try {
      await adminApi.patch(`/admin/cities/${id}`, { isFeatured: value });
    } catch {
      setItems(prev);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Города"
        actions={
          <Button className="gap-1" onClick={() => navigate('/cities/new')}>
            <Plus className="h-4 w-4" />
            Добавить
          </Button>
        }
      />

      {error && (
        <ErrorState
          title="Не удалось загрузить список городов"
          description={error}
          action={
            <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => window.location.reload()}>
              Повторить попытку
            </button>
          }
        />
      )}

      <Card>
        {items.length === 0 && !loading ? (
          <div className="p-6">
            <EmptyState title="Нет городов" description="Добавьте хотя бы один город, чтобы начать заполнять каталог." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Город</TableHead>
                <TableHead className="text-center">
                  <Calendar className="h-3.5 w-3.5 inline mr-1" />
                  Событий
                </TableHead>
                <TableHead className="text-center">
                  <Building2 className="h-3.5 w-3.5 inline mr-1" />
                  Площадок
                </TableHead>
                <TableHead className="text-center">
                  <Megaphone className="h-3.5 w-3.5 inline mr-1" />
                  Промо
                </TableHead>
                <TableHead className="text-center">В витрине</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/cities/${item.id}`)}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">/{item.slug}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.description || '—'}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <a
                      className="text-primary hover:underline font-medium"
                      href={`/admin/events?city=${item.slug}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item._count?.events ?? 0}
                    </a>
                  </TableCell>
                  <TableCell className="text-center">
                    <a
                      className="text-primary hover:underline"
                      href={`/admin/venues?city=${item.slug}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item._count?.landingPages ?? 0}
                    </a>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">—</TableCell>
                  <TableCell className="text-center">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch checked={!!item.isFeatured} onCheckedChange={(v) => void handleToggleFeatured(item.id, v)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
