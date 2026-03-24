import { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorState, PageHeader } from '@daibilet/shared-ui';

import { TagChip } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CollectionItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  city: { name: string; slug: string } | null;
  isActive: boolean;
  sourceType: 'MANUAL' | 'SUGGESTED' | 'HYBRID' | 'ACTIVE';
  status: 'DRAFT' | 'SUGGESTED' | 'ACTIVE' | 'REJECTED' | 'ARCHIVED';
  selectionBasis: 'MANUAL' | 'POPULAR' | 'STRUCTURAL' | 'COMBINATION';
  eventCountCached?: number | null;
  sortOrder: number;
  filterCategory: string | null;
  filterTags: string[];
  pinnedCount: number;
  excludedCount: number;
  updatedAt: string;
}

const _baseColumns: ColumnDef<CollectionItem>[] = [];
const STATUS_LABELS: Record<CollectionItem['status'], string> = {
  DRAFT: 'Черновик',
  SUGGESTED: 'Предложено',
  ACTIVE: 'Активна',
  REJECTED: 'Отклонена',
  ARCHIVED: 'В архиве',
};

const SOURCE_LABELS: Record<CollectionItem['sourceType'], string> = {
  MANUAL: 'Ручной',
  SUGGESTED: 'Предложенный',
  HYBRID: 'Гибридный',
  ACTIVE: 'Активный',
};

export function CollectionsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [city, setCity] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (sourceType) params.set('sourceType', sourceType);
    if (city) params.set('city', city);
    return params.toString();
  }, [search, status, sourceType, city]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const path = query ? `/admin/collections?${query}` : '/admin/collections';

    adminApi
      .get<{ items: CollectionItem[] }>(path)
      .then((data) => setItems(data.items ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [query]);

  const onToggleActive = useCallback(async (item: CollectionItem, next: boolean) => {
    // Guard: черновик нельзя включить
    if (item.status === 'DRAFT' && next) return;
    const prev = items;
    setItems((curr) => curr.map((x) => (x.id === item.id ? { ...x, isActive: next } : x)));
    try {
      await adminApi.patch(`/admin/collections/${item.id}`, { isActive: next });
    } catch {
      setItems(prev);
    }
  }, [items]);

  const onGenerate = async () => {
    setLoading(true);
    await adminApi.post('/admin/collections/suggestions/generate');
    const data = await adminApi.get<{ items: CollectionItem[] }>(query ? `/admin/collections?${query}` : '/admin/collections');
    setItems(data.items ?? []);
    setLoading(false);
  };

  const columns = useMemo<ColumnDef<CollectionItem>[]>(() => [], [onToggleActive]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Подборки"
        subtitle="Тематические посадочные страницы с курированным контентом"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onGenerate}>Сгенерировать предложения</Button>
            <Button onClick={() => navigate('/collections/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Создать подборку
            </Button>
          </div>
        }
      />

      {error && (
        <ErrorState title="Не удалось загрузить подборки" description={error} />
      )}

      <div className="rounded-[10px] border border-border/80 bg-white">
        <div className="m-[10px] space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              placeholder="Поиск по названию или URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={status || '__all__'} onValueChange={(v) => setStatus(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все статусы</SelectItem>
                  {(['SUGGESTED', 'ACTIVE', 'DRAFT', 'REJECTED', 'ARCHIVED'] as CollectionItem['status'][]).map((x) => (
                    <SelectItem key={x} value={x}>{STATUS_LABELS[x]}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={sourceType || '__all__'} onValueChange={(v) => setSourceType(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Источник" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все источники</SelectItem>
                  {(['SUGGESTED', 'MANUAL', 'ACTIVE', 'HYBRID'] as CollectionItem['sourceType'][]).map((x) => (
                    <SelectItem key={x} value={x}>{SOURCE_LABELS[x]}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="city URL (spb)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-[180px]"
            />
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
                  <TableHead>Название</TableHead>
                  <TableHead>Город</TableHead>
                  <TableHead>Фильтры</TableHead>
                  <TableHead>Курация</TableHead>
                  <TableHead>Порядок</TableHead>
                  <TableHead>Вкл/Выкл</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Нет подборок. Создайте первую!
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/collections/${item.id}`)}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{item.title}</span>
                          {item.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</p>}
                        </div>
                      </TableCell>
                      <TableCell>{item.city?.name || <TagChip label="Кросс-город" />}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.filterCategory && <TagChip label={item.filterCategory} />}
                          {item.filterTags.map((t) => (
                            <TagChip key={t} label={t} />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs tabular-nums">📌 {item.pinnedCount} / 🚫 {item.excludedCount}</span>
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums">{item.sortOrder}</span>
                      </TableCell>
                      <TableCell>
                        <div onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.isActive}
                              disabled={item.status === 'DRAFT' && !item.isActive}
                              onCheckedChange={(checked) => void onToggleActive(item, checked)}
                            />
                            {item.status === 'DRAFT' && !item.isActive && (
                              <span className="text-[10px] text-amber-700">Черновик</span>
                            )}
                          </div>
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
    </div>
  );
}
