import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState, PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type TagCategory = 'THEME' | 'AUDIENCE' | 'SEASON' | 'SPECIAL';
type TagKind = 'STRUCTURAL' | 'POPULAR';
type StructuralTagGroup = 'THEME' | 'AUDIENCE' | 'FORMAT';
type TagUiCategory = 'THEME' | 'AUDIENCE' | 'FORMAT' | 'SEASON' | 'POPULAR';

interface TagItem {
  id: string;
  name: string;
  slug: string;
  category: TagCategory;
  tagKind?: TagKind | null;
  structuralGroup?: StructuralTagGroup | null;
  isActive: boolean;
  _count?: { events?: number };
}

const CATEGORY_VARIANTS: Record<TagUiCategory, 'success' | 'warning' | 'secondary' | 'default'> = {
  THEME: 'secondary',
  AUDIENCE: 'success',
  FORMAT: 'default',
  SEASON: 'warning',
  POPULAR: 'default',
};

const CATEGORY_LABELS: Record<TagUiCategory, string> = {
  THEME: 'Тема',
  AUDIENCE: 'Аудитория',
  FORMAT: 'Формат',
  SEASON: 'Сезонность',
  POPULAR: 'Популярный',
};

function toUiCategory(tag: TagItem): TagUiCategory {
  if (tag.tagKind === 'POPULAR') return 'POPULAR';
  if (tag.structuralGroup === 'FORMAT') return 'FORMAT';
  if (tag.category === 'SPECIAL') return 'FORMAT';
  if (tag.category === 'AUDIENCE') return 'AUDIENCE';
  if (tag.category === 'SEASON') return 'SEASON';
  return 'THEME';
}

export function TagsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [busyTagId, setBusyTagId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (category === 'THEME' || category === 'AUDIENCE' || category === 'SEASON') {
      params.set('category', category);
    } else if (category === 'FORMAT' || category === 'POPULAR') {
      params.set('category', 'SPECIAL');
    }
    if (search) params.set('search', search);

    adminApi
      .get<TagItem[] | { items: TagItem[] }>(`/admin/tags${params.toString() ? `?${params}` : ''}`)
      .then((res) => setData(Array.isArray(res) ? res : ((res as { items?: TagItem[] }).items ?? [])))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [category, search]);

  const handleRowClick = (item: TagItem) => {
    navigate(`/tags/${item.id}`);
  };

  const handleToggleActive = async (tag: TagItem, nextActive: boolean) => {
    setBusyTagId(tag.id);
    const prevData = data;
    setData((curr) => curr.map((x) => (x.id === tag.id ? { ...x, isActive: nextActive } : x)));
    try {
      await adminApi.patch(`/admin/tags/${tag.id}`, { isActive: nextActive });
    } catch (e) {
      setData(prevData);
      setError(e instanceof Error ? e.message : 'Ошибка обновления статуса тега');
    } finally {
      setBusyTagId(null);
    }
  };

  const visibleData = data.filter((item) => {
    if (!category) return true;
    return toUiCategory(item) === category;
  });

  const hasActiveFilters = Boolean(category || search.trim());

  return (
    <div className="space-y-4">
      <PageHeader
        title="Теги"
        subtitle="Управление тегами для категоризации событий"
        actions={
          <Button asChild>
            <Link to="/tags/new">
              <Plus className="mr-2 h-4 w-4" />
              Создать
            </Link>
          </Button>
        }
      />

      {error && (
        <ErrorState
          title="Не удалось загрузить теги"
          description={error}
          action={<Button variant="outline" onClick={() => window.location.reload()}>Повторить попытку</Button>}
        />
      )}

      {loading ? (
        <LoadingState label="Загружаем теги..." />
      ) : visibleData.length === 0 ? (
        <EmptyState
          title="Нет тегов"
          description="Создайте первый тег, чтобы начать категоризацию событий и лендингов."
        />
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-border/80 bg-white shadow-none [&_tbody_tr:focus-within]:!bg-transparent [&_tbody_tr:focus-within]:!ring-0">
          <div className="m-[10px] space-y-3">
            <div className="flex w-full flex-wrap items-center gap-1.5 py-0.5">
              <Input
                type="text"
                placeholder="Поиск по названию или URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md"
              />
              <Select value={category || '__all__'} onValueChange={(v) => setCategory(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Все категории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Все категории</SelectItem>
                  {(Object.keys(CATEGORY_LABELS) as TagUiCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setCategory('');
                  setSearch('');
                }}
              >
                Сбросить
              </Button>
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
                    <TableHead>URL</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Событий</TableHead>
                    <TableHead>Активен</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        Нет тегов
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleData.map((item) => (
                      <TableRow key={item.id} className="cursor-pointer" onClick={() => handleRowClick(item)}>
                        <TableCell>
                          <span className="font-medium">{item.name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground">{item.slug}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={CATEGORY_VARIANTS[toUiCategory(item)] ?? 'default'}>
                            {CATEGORY_LABELS[toUiCategory(item)] ?? toUiCategory(item)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="tabular-nums">{item._count?.events ?? 0}</span>
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <Switch
                              checked={item.isActive}
                              disabled={busyTagId === item.id}
                              onCheckedChange={(checked) => void handleToggleActive(item, checked)}
                            />
                            <span className="text-xs text-muted-foreground">{item.isActive ? 'Вкл' : 'Выкл'}</span>
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
    </div>
  );
}
