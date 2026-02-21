import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RotateCcw, RefreshCw } from 'lucide-react';

const QUEUE_OPTIONS = [
  { value: '_all', label: 'Все очереди' },
  { value: 'sync', label: 'sync' },
  { value: 'fulfillment', label: 'fulfillment' },
  { value: 'emails', label: 'emails' },
  { value: 'review-tasks', label: 'review-tasks' },
  { value: 'partner-webhooks', label: 'partner-webhooks' },
];

interface FailedJob {
  jobId: string;
  queue: string;
  name: string;
  attemptsMade: number;
  attempts: number;
  failedReason: string;
  stackShort: string | null;
  timestamp: number;
  finishedOn?: number;
}

export function FailedJobsPage() {
  const [jobs, setJobs] = useState<FailedJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState('_all');
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '50');
    if (queue && queue !== '_all') params.set('queue', queue);

    adminApi
      .get<{ jobs: FailedJob[]; total: number }>(`/admin/jobs/failed?${params}`)
      .then((data) => {
        setJobs(data.jobs);
        setTotal(data.total);
      })
      .catch((e) => {
        console.error('Load failed jobs:', e);
        toast.error('Не удалось загрузить список');
      })
      .finally(() => setLoading(false));
  }, [queue]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRetry = async (q: string, jobId: string) => {
    setRetrying(jobId);
    try {
      await adminApi.post(`/admin/jobs/failed/${q}/${jobId}/retry`);
      toast.success('Job повторно добавлен в очередь');
      load();
    } catch (e) {
      console.error('Retry failed:', e);
      toast.error('Ошибка при retry');
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Failed Jobs</CardTitle>
          <CardDescription>
            Провалившиеся задачи из очередей BullMQ. Кнопка Retry повторно ставит job в очередь (с аудитом).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select value={queue} onValueChange={setQueue}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Очередь" />
              </SelectTrigger>
              <SelectContent>
                {QUEUE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Загрузка…</p>
          ) : jobs.length === 0 ? (
            <p className="text-muted-foreground">Нет failed jobs</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left">Queue</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Job ID</th>
                    <th className="px-4 py-2 text-left">Attempts</th>
                    <th className="px-4 py-2 text-left">Timestamp</th>
                    <th className="px-4 py-2 text-left">Reason</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={`${j.queue}-${j.jobId}`} className="border-t">
                      <td className="px-4 py-2">
                        <Badge variant="secondary">{j.queue}</Badge>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{j.name}</td>
                      <td className="px-4 py-2 font-mono text-xs">{j.jobId}</td>
                      <td className="px-4 py-2">
                        {j.attemptsMade}/{j.attempts}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {j.finishedOn
                          ? new Date(j.finishedOn).toLocaleString('ru-RU')
                          : new Date(j.timestamp).toLocaleString('ru-RU')}
                      </td>
                      <td className="px-4 py-2 max-w-xs truncate" title={j.failedReason}>
                        {j.failedReason}
                      </td>
                      <td className="px-4 py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(j.queue, j.jobId)}
                          disabled={retrying === j.jobId}
                        >
                          <RotateCcw className={`h-4 w-4 mr-1 ${retrying === j.jobId ? 'animate-spin' : ''}`} />
                          Retry
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">Всего: {total}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
