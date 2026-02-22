import { CalendarDays, Play, Pause, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Schedule {
  id: string;
  offerId: string;
  type: string;
  timezone: string;
  isActive: boolean;
  offer?: { id: string; event?: { title: string } };
}

const TYPE_LABELS: Record<string, string> = {
  ONE_TIME: 'Разовое',
  OPEN_DATE: 'Открытая дата',
  RECURRENCE: 'Повторяемое',
};

export function EventStudioPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderOfferId, setBuilderOfferId] = useState('');
  const [builderType, setBuilderType] = useState<'ONE_TIME' | 'OPEN_DATE' | 'RECURRENCE'>('RECURRENCE');
  const [builderStartAt, setBuilderStartAt] = useState('');
  const [builderSubmitting, setBuilderSubmitting] = useState(false);

  useEffect(() => {
    adminApi
      .get<Schedule[]>('/admin/schedules')
      .then(setSchedules)
      .catch(() => toast.error('Не удалось загрузить расписания'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await adminApi.patch(`/admin/schedules/${id}`, { isActive });
      setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, isActive } : s)));
      toast.success(isActive ? 'Продажи возобновлены' : 'Продажи приостановлены');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleBuilderSubmit = async () => {
    if (!builderOfferId.trim()) {
      toast.error('Укажите offerId');
      return;
    }
    const rule =
      builderType === 'ONE_TIME'
        ? { startAt: builderStartAt || new Date().toISOString(), endAt: new Date().toISOString() }
        : builderType === 'RECURRENCE'
          ? { daysOfWeek: [1, 2, 3, 4, 5], timeSlots: ['10:00'], allowedFrom: new Date().toISOString().slice(0, 10), allowedTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) }
          : { allowedFrom: new Date().toISOString().slice(0, 10), allowedTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) };
    setBuilderSubmitting(true);
    try {
      const schedule = await adminApi.post<Schedule>('/admin/schedules', {
        offerId: builderOfferId.trim(),
        type: builderType,
        rule,
      });
      setSchedules((prev) => [schedule, ...prev]);
      toast.success('Расписание создано');
      setBuilderOpen(false);
      setBuilderOfferId('');
      setBuilderStartAt('');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBuilderSubmitting(false);
    }
  };

  const handleGenerate = async (id: string) => {
    try {
      const res = await adminApi.post<{ generated: number }>(`/admin/schedules/${id}/generate`, {
        from: new Date().toISOString().slice(0, 10),
        to: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      });
      toast.success(`Создано ${res.generated} сеансов`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Event Studio</h1>
          <p className="text-muted-foreground">Расписания и сеансы</p>
        </div>
        <Button onClick={() => setBuilderOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Создать расписание
        </Button>
      </div>

      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Builder</DialogTitle>
            <DialogDescription>
              Создание расписания. offerId можно взять в редактировании события → раздел офферов.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Offer ID (UUID)</Label>
              <Input
                value={builderOfferId}
                onChange={(e) => setBuilderOfferId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div>
              <Label>Тип</Label>
              <select
                value={builderType}
                onChange={(e) => setBuilderType(e.target.value as 'ONE_TIME' | 'OPEN_DATE' | 'RECURRENCE')}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="ONE_TIME">Разовое</option>
                <option value="OPEN_DATE">Открытая дата</option>
                <option value="RECURRENCE">Повторяемое</option>
              </select>
            </div>
            {builderType === 'ONE_TIME' && (
              <div>
                <Label>Дата и время начала</Label>
                <Input
                  type="datetime-local"
                  value={builderStartAt}
                  onChange={(e) => setBuilderStartAt(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuilderOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleBuilderSubmit} disabled={builderSubmitting}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {schedules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Нет расписаний. Создайте через API или EventEdit.</p>
            </CardContent>
          </Card>
        ) : (
          schedules.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{s.offer?.event?.title ?? s.offerId}</CardTitle>
                  <Badge variant={s.isActive ? 'default' : 'secondary'}>{s.isActive ? 'Активно' : 'Пауза'}</Badge>
                </div>
                <CardDescription>{TYPE_LABELS[s.type] ?? s.type}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to={`/schedules/${s.id}`}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Сеансы
                  </Link>
                </Button>
                <Button
                  variant={s.isActive ? 'outline' : 'default'}
                  size="sm"
                  className="w-full"
                  onClick={() => handleToggleActive(s.id, !s.isActive)}
                >
                  {s.isActive ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {s.isActive ? 'Пауза' : 'Запуск'}
                </Button>
                {s.type === 'RECURRENCE' && (
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => handleGenerate(s.id)}>
                    <Play className="mr-2 h-4 w-4" />
                    Сгенерировать 90 дней
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
