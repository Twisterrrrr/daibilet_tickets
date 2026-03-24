import { Building2, Calendar, Megaphone, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState, ErrorState, PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    venues?: number;
    landingPages?: number;
    comboPages?: number;
  };
}

function shortDescription(text?: string | null): string {
  if (!text) return '—';
  const words = text.trim().split(/\s+/);
  if (words.length <= 4) return text;
  return `${words.slice(0, 4).join(' ')}...`;
}

export function CitiesListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CityItem[]>([]);
  const [search, setSearch] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'regular'>('all');
  const [withLandingsOnly, setWithLandingsOnly] = useState(false);
  const [withCombosOnly, setWithCombosOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'events' | 'venues' | 'landings' | 'combos' | 'featured'>('events');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
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

  const filteredItems = items.filter((item) => {
    const q = search.trim().toLowerCase();
    const bySearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.slug.toLowerCase().includes(q) ||
      (item.description ?? '').toLowerCase().includes(q);

    const byFeatured =
      featuredFilter === 'all' ||
      (featuredFilter === 'featured' && item.isFeatured) ||
      (featuredFilter === 'regular' && !item.isFeatured);

    const landingsCount = item._count?.landingPages ?? 0;
    const combosCount = item._count?.comboPages ?? 0;

    const byLandings = !withLandingsOnly || landingsCount > 0;

    const byCombos = !withCombosOnly || combosCount > 0;

    return bySearch && byFeatured && byLandings && byCombos;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const factor = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'ru') * factor;
    if (sortBy === 'events') return ((a._count?.events ?? 0) - (b._count?.events ?? 0)) * factor;
    if (sortBy === 'venues') return ((a._count?.venues ?? 0) - (b._count?.venues ?? 0)) * factor;
    if (sortBy === 'landings') return ((a._count?.landingPages ?? 0) - (b._count?.landingPages ?? 0)) * factor;
    if (sortBy === 'combos') return ((a._count?.comboPages ?? 0) - (b._count?.comboPages ?? 0)) * factor;
    return ((a.isFeatured ? 1 : 0) - (b.isFeatured ? 1 : 0)) * factor;
  });

  const toggleSort = (key: typeof sortBy) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    setSortDir('asc');
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

      <Card className="rounded-[10px] border-border/80 bg-white shadow-none">
        {items.length === 0 && !loading ? (
          <div className="p-6">
            <EmptyState title="Нет городов" description="Добавьте хотя бы один город, чтобы начать заполнять каталог." />
          </div>
        ) : (
          <div className="px-[10px] pt-[10px] pb-[10px]">
            <div className="space-y-3">
              <div className="flex w-full flex-wrap items-center gap-1.5 rounded-[10px] bg-white p-2.5">
                <Input
                  placeholder="Поиск по городу, URL, описанию..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-md"
                />
                <Select value={featuredFilter} onValueChange={(v) => setFeaturedFilter(v as typeof featuredFilter)}>
                  <SelectTrigger className="w-[190px]">
                    <SelectValue placeholder="Все" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="featured">Только в витрине</SelectItem>
                    <SelectItem value="regular">Не в витрине</SelectItem>
                  </SelectContent>
                </Select>
                <label className="inline-flex h-8 items-center gap-2 px-1.5 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={withLandingsOnly}
                    onChange={(e) => setWithLandingsOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Есть лендинги
                </label>
                <label className="inline-flex h-8 items-center gap-2 px-1.5 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={withCombosOnly}
                    onChange={(e) => setWithCombosOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Есть подборки
                </label>
              </div>

              <div className="overflow-hidden rounded-[10px] border border-border/80">
                <Table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: '40%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort('name')}>
                          Город
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" className="inline-flex items-center gap-1 whitespace-nowrap" onClick={() => toggleSort('events')}>
                          <Calendar className="h-3.5 w-3.5" />
                          Событий
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" className="inline-flex items-center gap-1 whitespace-nowrap" onClick={() => toggleSort('venues')}>
                          <Building2 className="h-3.5 w-3.5" />
                          Площадок
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" className="inline-flex items-center gap-1 whitespace-nowrap" onClick={() => toggleSort('landings')}>
                          <Megaphone className="h-3.5 w-3.5" />
                          Лендингов
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" className="inline-flex items-center gap-1 whitespace-nowrap" onClick={() => toggleSort('combos')}>
                          <Megaphone className="h-3.5 w-3.5" />
                          Подборок
                        </button>
                      </TableHead>
                      <TableHead>
                        <button type="button" className="inline-flex items-center gap-1 whitespace-nowrap" onClick={() => toggleSort('featured')}>
                          В витрине
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          Загрузка...
                        </TableCell>
                      </TableRow>
                    ) : sortedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          Нет городов по текущим фильтрам
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedItems.map((item) => (
                        <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/cities/${item.id}`)}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{item.name}</span>
                              <span className="ml-2 text-xs text-muted-foreground">/{item.slug}</span>
                              <div className="text-xs text-muted-foreground">{shortDescription(item.description)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <a
                              className="font-medium text-primary hover:underline"
                              href={`/admin/events?city=${item.slug}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item._count?.events ?? 0}
                            </a>
                          </TableCell>
                          <TableCell>
                            <a
                              className="font-medium text-primary hover:underline"
                              href={`/admin/venues?city=${item.slug}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item._count?.venues ?? 0}
                            </a>
                          </TableCell>
                          <TableCell>
                            <span className="tabular-nums text-sm">{item._count?.landingPages ?? 0}</span>
                          </TableCell>
                          <TableCell>
                            <span className="tabular-nums text-sm">{item._count?.comboPages ?? 0}</span>
                          </TableCell>
                          <TableCell>
                            <div onClick={(e) => e.stopPropagation()}>
                              <Switch checked={!!item.isFeatured} onCheckedChange={(v) => void handleToggleFeatured(item.id, v)} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
