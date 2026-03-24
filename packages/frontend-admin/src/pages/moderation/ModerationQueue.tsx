import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image,
  MapPin,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState, ErrorState, LoadingState, PageHeader } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type SortBy = 'created_desc' | 'trust_asc';

export function ModerationQueuePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>('created_desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    const params = sortBy === 'trust_asc' ? '?sortBy=trust_asc' : '';
    adminApi
      .get<{ items: unknown[]; total: number }>(`/admin/moderation/queue${params}`)
      .then((res) => {
        setEvents(res.items || []);
        setTotal(res.total || 0);
        const nextItems = (res.items as any[]) || [];
        setSelectedId((prev) => (prev && nextItems.some((e) => e.id === prev) ? prev : nextItems[0]?.id ?? null));
      })
      .catch((err: unknown) => {
        setEvents([]);
        setTotal(0);
        setSelectedId(null);
        setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить очередь модерации');
      })
      .finally(() => setLoading(false));
  }, [sortBy]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string) => {
    try {
      await adminApi.post(`/admin/moderation/${id}/approve`);
      toast.success('Событие одобрено');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const reject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    try {
      await adminApi.post(`/admin/moderation/${rejectId}/reject`, { reason: rejectReason });
      toast.success('Событие отклонено');
      setRejectId(null);
      setRejectReason('');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const selectedIndex = Math.max(0, events.findIndex((e) => e.id === selectedId));
  const selectedEvent = events[selectedIndex] ?? null;

  const selectPrev = () => {
    if (events.length === 0) return;
    const prevIndex = Math.max(0, selectedIndex - 1);
    setSelectedId(events[prevIndex].id);
  };

  const selectNext = () => {
    if (events.length === 0) return;
    const nextIndex = Math.min(events.length - 1, selectedIndex + 1);
    setSelectedId(events[nextIndex].id);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Модерация событий"
        subtitle={loading ? 'Загружаем очередь модерации...' : `${total} событий ожидают проверки`}
        actions={
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">На модерации (новые)</SelectItem>
              <SelectItem value="trust_asc">По trust (низкий приоритет)</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Reject dialog */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[400px] space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-semibold">Причина отклонения</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={3}
              placeholder="Укажите причину..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejectId(null);
                  setRejectReason('');
                }}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Отмена
              </button>
              <button
                onClick={reject}
                disabled={!rejectReason.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}

      {loadError ? (
        <ErrorState
          title="Не удалось загрузить модерацию"
          description={loadError}
          action={
            <Button variant="outline" onClick={load}>
              Повторить попытку
            </Button>
          }
        />
      ) : loading ? (
        <LoadingState label="Загружаем события на модерации..." />
      ) : events.length === 0 ? (
        <EmptyState
          title="Нет событий на модерации"
          description="Все отправленные события уже рассмотрены."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <div className="max-h-[calc(100vh-220px)] space-y-2 overflow-auto pr-1">
            {events.map((event) => {
              const isSelected = event.id === selectedId;
              return (
                <Card
                  key={event.id}
                  className={`cursor-pointer transition-colors hover:border-primary/50 ${
                    isSelected ? 'border-primary ring-1 ring-primary/20' : ''
                  }`}
                  onClick={() => setSelectedId(event.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{event.title}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{event.operator?.companyName || event.operator?.name || '—'}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{event.createdAt ? 'Недавно' : '—'}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0 bg-warning/10 text-[10px] text-warning">
                        На модерации
                      </Badge>
                    </div>
                    <div className="mt-2 flex gap-1">
                      {!event.imageUrl && (
                        <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
                          <Image className="h-2.5 w-2.5" /> Нет фото
                        </span>
                      )}
                      {(!event._count?.offers || event._count?.offers === 0) && (
                        <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
                          <CalendarDays className="h-2.5 w-2.5" /> Нет расписания
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedEvent && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={selectPrev} disabled={selectedIndex === 0}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {selectedIndex + 1} / {events.length}
                    </span>
                    <Button variant="ghost" size="icon" onClick={selectNext} disabled={selectedIndex >= events.length - 1}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Badge variant="secondary" className="bg-warning/10 text-[10px] text-warning">
                    На модерации
                  </Badge>
                </div>
                <CardTitle className="mt-2 text-lg">{selectedEvent.title}</CardTitle>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {selectedEvent.operator?.companyName || selectedEvent.operator?.name || '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedEvent.city?.name || '—'}
                  </span>
                  <span>{selectedEvent.category || '—'}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-medium">Чеклист публикации</h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-2 rounded p-1.5 text-sm text-success">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      Заголовок заполнен
                    </div>
                    <div className="flex items-center gap-2 rounded p-1.5 text-sm text-destructive bg-destructive/5">
                      {selectedEvent.description ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0" />}
                      Описание {'>'} 100 символов
                    </div>
                    <div className="flex items-center gap-2 rounded p-1.5 text-sm text-destructive bg-destructive/5">
                      {selectedEvent.imageUrl ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0" />}
                      Фото загружено
                    </div>
                    <div className="flex items-center gap-2 rounded p-1.5 text-sm text-destructive bg-destructive/5">
                      {(selectedEvent._count?.offers || 0) > 0 ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0" />}
                      Расписание настроено
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4" /> Описание
                  </h3>
                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    {selectedEvent.description || 'Описание отсутствует.'}
                  </div>
                </div>

                <div className="space-y-3">
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Комментарий модератора (обязателен при отклонении)..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-success hover:bg-success/90" onClick={() => approve(selectedEvent.id)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Одобрить
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={!rejectReason.trim()}
                      onClick={() => setRejectId(selectedEvent.id)}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      На доработку
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={!rejectReason.trim()}
                      onClick={() => setRejectId(selectedEvent.id)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Отклонить
                    </Button>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Для отклонения или возврата на доработку добавьте комментарий
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
