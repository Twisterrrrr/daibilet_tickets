import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { TagChip } from '@daibilet/shared-ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LandingItem {
  id: string;
  title: string;
  slug: string;
  filterTag: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  templateType: 'GENERIC_CARDS' | 'COMPARISON_TABLE' | 'HYBRID' | 'SEASONAL_EVENT';
  showInCollections: boolean;
  isIndexable: boolean;
  eventCountCached?: number | null;
  isActive: boolean;
  sortOrder: number;
  city?: { name: string; slug: string };
}

interface CityItem {
  id: string;
  name: string;
  slug: string;
}

const STATUS_LABELS: Record<LandingItem['status'], string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активен',
  ARCHIVED: 'В архиве',
};

// ─── Page ────────────────────────────────────────────────────────────────────

export function LandingsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<LandingItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (cityFilter) params.set('city', cityFilter);

    adminApi
      .get<LandingItem[] | { items: LandingItem[] }>(`/admin/landings${params.toString() ? `?${params}` : ''}`)
      .then((res) => setData(Array.isArray(res) ? res : (res?.items ?? [])))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [cityFilter]);

  useEffect(() => {
    adminApi
      .get<CityItem[] | { items: CityItem[] }>('/admin/cities')
      .then((res) => {
        const list = Array.isArray(res) ? res : ((res as { items: CityItem[] }).items ?? []);
        setCities(list);
      })
      .catch((e) => console.error('Load cities failed:', e));
  }, []);

  const handleToggleActive = async (item: LandingItem, next: boolean) => {
    // Guard: черновик нельзя включить
    if (item.status === 'DRAFT' && next) return;
    const prev = data;
    setData((curr) => curr.map((x) => (x.id === item.id ? { ...x, isActive: next } : x)));
    try {
      await adminApi.patch(`/admin/landings/${item.id}`, { isActive: next });
    } catch {
      setData(prev);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Лендинги"
        subtitle="Управление лендинг-страницами по городам и тегам"
        actions={
          <Button asChild>
            <Link to="/landings/new" className="gap-2">
              <Plus className="h-4 w-4" />
              Создать
            </Link>
          </Button>
        }
      />

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список лендингов</CardTitle>
          <CardDescription>Выберите город для фильтрации или оставьте «Все города»</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={cityFilter || '__all__'} onValueChange={(v) => setCityFilter(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Все города" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все города</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-border/80">
            <Table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '40%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Город</TableHead>
                  <TableHead>В подборках</TableHead>
                  <TableHead>Порядок</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Нет лендингов
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/landings/${item.id}`)}>
                      <TableCell>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">/{item.slug}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{item.city?.name ?? '—'}</span>
                      </TableCell>
                      <TableCell>
                        <TagChip label={item.showInCollections ? 'Да' : 'Нет'} />
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums text-sm">{item.sortOrder}</span>
                      </TableCell>
                      <TableCell>
                        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                          <Switch
                            checked={item.isActive}
                            disabled={item.status === 'DRAFT' && !item.isActive}
                            onCheckedChange={(checked) => void handleToggleActive(item, checked)}
                          />
                          <span className="text-xs text-muted-foreground">{item.isActive ? 'Вкл' : 'Выкл'}</span>
                          {item.status === 'DRAFT' && !item.isActive && (
                            <span className="text-[10px] text-amber-700">Черновик</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
