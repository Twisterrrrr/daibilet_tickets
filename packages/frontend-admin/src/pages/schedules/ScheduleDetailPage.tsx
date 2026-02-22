import { CalendarDays, Loader2, Pause, Play, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Occurrence {
  id: string;
  startsAt: string;
  status: string;
  capacityTotal: number | null;
  capacitySold: number;
}

export function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const loadOccurrences = useCallback(() => {
    if (!id) return;
    adminApi
      .get<Occurrence[]>(`/admin/schedules/${id}/occurrences`)
      .then(setOccurrences)
      .catch(() => toast.error('Не удалось загрузить сеансы'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    loadOccurrences();
  }, [id, loadOccurrences]);

  const handleBulk = async (action: 'pause' | 'resume' | 'cancel') => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.error('Выберите сеансы');
      return;
    }
    setBulkLoading(true);
    try {
      const res = await adminApi.post<{ updated: number; errors: string[] }>(
        '/admin/schedules/occurrences/bulk',
        { sessionIds: ids, action, reason: action === 'cancel' ? 'Bulk cancel' : undefined },
      );
      toast.success(`Обновлено: ${res.updated}${res.errors?.length ? `, ошибок: ${res.errors.length}` : ''}`);
      setSelected(new Set());
      loadOccurrences();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelect = (oid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(oid)) next.delete(oid);
      else next.add(oid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === occurrences.length) setSelected(new Set());
    else setSelected(new Set(occurrences.map((o) => o.id)));
  };

  if (!id) return null;
  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Сеансы расписания</h1>
        <Button variant="outline" size="sm" asChild>
          <Link to="/schedules">← Назад</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Ближайшие сеансы
          </CardTitle>
          {occurrences.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === occurrences.length && occurrences.length > 0}
                  onChange={() => toggleSelectAll()}
                  className="rounded"
                />
                <span className="text-sm text-muted-foreground">Выбрать все</span>
              </label>
              <Button
                size="sm"
                variant="outline"
                disabled={selected.size === 0 || bulkLoading}
                onClick={() => handleBulk('pause')}
              >
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4 mr-1" />}
                Пауза
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selected.size === 0 || bulkLoading}
                onClick={() => handleBulk('resume')}
              >
                <Play className="h-4 w-4 mr-1" />
                Возобновить
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={selected.size === 0 || bulkLoading}
                onClick={() => handleBulk('cancel')}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Отменить
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {occurrences.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет сеансов</p>
          ) : (
            <ul className="space-y-2">
              {occurrences.slice(0, 50).map((o) => (
                <li key={o.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggleSelect(o.id)}
                    className="rounded"
                  />
                  <span>{new Date(o.startsAt).toLocaleString('ru-RU')}</span>
                  <Badge variant={o.status === 'ACTIVE' ? 'default' : 'secondary'}>{o.status}</Badge>
                  {o.capacityTotal != null && (
                    <span className="text-muted-foreground">
                      {o.capacitySold}/{o.capacityTotal}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
