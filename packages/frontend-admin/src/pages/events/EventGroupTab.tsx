import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Link2, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import type { EventGroupResponse, EventSearchResult } from '@/lib/api/groups';
import {
  clearEventGrouping,
  getEventGroup,
  makeEventCanonical,
  searchEvents,
  setEventGroupingKey,
} from '@/lib/api/groups';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Props = {
  eventId: string;
};

export function EventGroupTab({ eventId }: Props) {
  const queryClient = useQueryClient();
  const [groupingInput, setGroupingInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSearch, setSelectedSearch] = useState<EventSearchResult | null>(null);

  const groupQuery = useQuery<EventGroupResponse>({
    queryKey: ['admin', 'eventGroup', eventId],
    queryFn: () => getEventGroup(eventId),
  });

  const searchQuery = useQuery<EventSearchResult[]>({
    queryKey: ['admin', 'eventSearch', searchTerm],
    queryFn: () => searchEvents(searchTerm),
    enabled: searchTerm.trim().length >= 2,
  });

  const updateGroupingMutation = useMutation({
    mutationFn: (groupingKey: string) => setEventGroupingKey(eventId, groupingKey),
    onSuccess: () => {
      toast.success('Группа обновлена');
      queryClient.invalidateQueries({ queryKey: ['admin', 'eventGroup', eventId] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Не удалось обновить группу');
    },
  });

  const clearGroupingMutation = useMutation({
    mutationFn: (targetId: string) => clearEventGrouping(targetId),
    onSuccess: () => {
      toast.success('Событие удалено из группы');
      queryClient.invalidateQueries({ queryKey: ['admin', 'eventGroup', eventId] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Не удалось удалить из группы');
    },
  });

  const makeCanonicalMutation = useMutation({
    mutationFn: () => makeEventCanonical(eventId),
    onSuccess: () => {
      toast.success('Событие сделано каноническим в группе');
      queryClient.invalidateQueries({ queryKey: ['admin', 'eventGroup', eventId] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Не удалось сделать событие каноническим');
    },
  });

  const addToGroupMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const groupingKey = groupQuery.data?.groupingKey;
      if (!groupingKey) {
        throw new Error('Сначала задайте groupingKey для текущего события');
      }
      await setEventGroupingKey(targetId, groupingKey);
    },
    onSuccess: () => {
      toast.success('Событие добавлено в группу');
      setSelectedSearch(null);
      setSearchTerm('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'eventGroup', eventId] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Не удалось добавить событие в группу');
    },
  });

  const group = groupQuery.data;
  const canonicalItem =
    group && group.canonicalEventId
      ? group.items.find((it) => it.id === group.canonicalEventId) ?? null
      : null;

  const handleApplyGroupingKey = () => {
    const value = groupingInput.trim();
    if (!value) {
      toast.error('Введите непустой ключ группы');
      return;
    }
    updateGroupingMutation.mutate(value);
  };

  const handleAddSelectedToGroup = () => {
    if (!selectedSearch) return;
    addToGroupMutation.mutate(selectedSearch.id);
  };

  return (
    <div className="space-y-6">
      {/* Блок 1 — статус группы */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Группа события</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {groupQuery.isLoading && <div>Загрузка группы…</div>}
          {groupQuery.isError && <div className="text-destructive">Не удалось загрузить группу.</div>}

          {group && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Grouping key</Label>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-[11px]">
                        {group.groupingKey ?? <span className="italic text-slate-400">нет</span>}
                      </span>
                      {group.groupingKey && (
                        <Badge variant="outline" className="text-[10px]">
                          В группе {group.items.length} событ.
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={groupingInput}
                        onChange={(e) => setGroupingInput(e.target.value)}
                        placeholder={group.groupingKey ?? 'Задать ключ группы'}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleApplyGroupingKey}
                        disabled={updateGroupingMutation.isPending}
                      >
                        {updateGroupingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Сохранить'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Каноническое внутри группы</Label>
                  <div className="flex items-center gap-2">
                    {group.isCanonical ? (
                      <Badge variant="default" className="bg-emerald-600 text-[11px]">
                        Каноническое
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px]">
                        Не каноническое
                      </Badge>
                    )}
                    {canonicalItem && canonicalItem.id !== eventId && (
                      <span className="text-xs text-muted-foreground">
                        Каноничное:{' '}
                        <span className="font-medium">
                          {canonicalItem.title}
                          {canonicalItem.cityName ? ` · ${canonicalItem.cityName}` : ''}
                        </span>{' '}
                        <code className="ml-1 font-mono text-[11px] text-slate-500">{canonicalItem.id}</code>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!group.groupingKey || group.isCanonical || makeCanonicalMutation.isPending}
                      onClick={() => makeCanonicalMutation.mutate()}
                    >
                      {makeCanonicalMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Сделать каноническим'
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      disabled={!group.groupingKey || clearGroupingMutation.isPending}
                      onClick={() => clearGroupingMutation.mutate(eventId)}
                    >
                      {clearGroupingMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="mr-1 h-4 w-4" />
                          Убрать из группы
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Блок 2 — список событий группы */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">События в группе</CardTitle>
        </CardHeader>
        <CardContent>
          {!group || group.items.length === 0 ? (
            <div className="text-sm text-muted-foreground">В группе пока нет других событий.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Событие</TableHead>
                    <TableHead>Город</TableHead>
                    <TableHead>Источник</TableHead>
                    <TableHead>Активно</TableHead>
                    <TableHead>Скрыто</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-xs text-sm">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{item.title}</span>
                          {item.id === eventId && (
                            <Badge variant="outline" className="text-[10px]">
                              Текущее
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground font-mono truncate">
                          {item.id}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.cityName}</TableCell>
                      <TableCell className="text-sm">{item.source}</TableCell>
                      <TableCell>
                        {item.isActive ? (
                          <Badge variant="outline" className="border-emerald-500 text-emerald-700 text-[11px]">
                            Да
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px]">
                            Нет
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.isHidden ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-700 text-[11px]">
                            Да
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px]">
                            Нет
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="icon" className="h-8 w-8">
                            <Link to={`/events/${item.id}`} title="Открыть карточку события">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            title="Убрать из группы"
                            disabled={clearGroupingMutation.isPending}
                            onClick={() => clearGroupingMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Блок 3 — добавить событие в группу */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Добавить событие в группу</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Поиск событий (название или slug)</Label>
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedSearch(null);
              }}
              placeholder="Начните вводить название или slug…"
            />
            {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
              <p className="text-[11px] text-muted-foreground">Введите минимум 2 символа для поиска.</p>
            )}
          </div>

          {searchQuery.isFetching && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Поиск…
            </div>
          )}

          {searchQuery.isSuccess && searchQuery.data.length > 0 && (
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border bg-background p-2 text-sm">
              {searchQuery.data.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs hover:bg-slate-50 ${
                    selectedSearch?.id === item.id ? 'bg-primary-50 text-primary-700' : ''
                  }`}
                  onClick={() => setSelectedSearch(item)}
                >
                  <span className="flex flex-col">
                    <span className="truncate">{item.title}</span>
                    <span className="text-[11px] text-muted-foreground">
                      <span className="font-mono">{item.id}</span> · {item.cityName || 'Город не задан'}
                    </span>
                  </span>
                  {selectedSearch?.id === item.id && (
                    <span className="ml-2 flex items-center gap-1 text-[11px] text-primary-700">
                      <Link2 className="h-3 w-3" />
                      Выбрано
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
            <span>
              Текущий groupingKey:{' '}
              <span className="font-mono text-[11px]">
                {group?.groupingKey ?? <span className="italic text-slate-400">не задан</span>}
              </span>
            </span>
            <Button
              type="button"
              size="sm"
              disabled={!selectedSearch || !group?.groupingKey || addToGroupMutation.isPending}
              onClick={handleAddSelectedToGroup}
            >
              {addToGroupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              Добавить в группу
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

