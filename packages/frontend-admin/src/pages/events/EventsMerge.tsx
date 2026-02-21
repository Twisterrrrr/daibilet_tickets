import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Merge, RefreshCw, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Candidate {
  eventA: { id: string; title: string; slug: string; cityId: string };
  eventB: { id: string; title: string; slug: string; cityId: string };
  similarity: number;
  reason: string;
}

export function EventsMergePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [autoMerging, setAutoMerging] = useState(false);

  const runAutoDedup = async () => {
    if (!confirm('Выполнить автодедупликацию? События с меньшим рейтингом будут деактивированы.')) return;
    setAutoMerging(true);
    try {
      const res = await adminApi.post<{ candidates: Candidate[]; merged: number }>('/admin/events/deduplicate-fuzzy?dryRun=false');
      toast.success(`Объединено: ${res.merged ?? 0} пар`);
      loadCandidates();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAutoMerging(false);
    }
  };

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get<{ candidates: Candidate[] }>('/admin/events/deduplicate-candidates');
      setCandidates(res.candidates || []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const markAsDuplicate = async (duplicateId: string, canonicalId: string) => {
    setMarking(duplicateId);
    try {
      await adminApi.patch(`/admin/events/${duplicateId}/mark-duplicate`, { canonicalOfId: canonicalId });
      toast.success('Событие помечено как дубль');
      setCandidates((prev) => prev.filter((c) => c.eventA.id !== duplicateId && c.eventB.id !== duplicateId));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setMarking(null);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Merge дублей событий</h1>
        <p className="text-muted-foreground mt-1">
          Поиск похожих событий (fuzzy-matching) и ручная пометка дублей. Дубли скрываются из каталога.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Кандидаты на дедупликацию</CardTitle>
            <CardDescription>Пары событий с похожими названиями в одном городе</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadCandidates} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
            <Button variant="secondary" size="sm" onClick={runAutoDedup} disabled={autoMerging || loading}>
              {autoMerging ? '...' : 'Запустить автодедуп'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Merge className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Дублей не найдено</p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((c, i) => (
                <div
                  key={`${c.eventA.id}-${c.eventB.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/events/${c.eventA.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.eventA.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">({c.eventA.slug})</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/events/${c.eventB.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.eventB.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">({c.eventB.slug})</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Сходство: {Math.round(c.similarity * 100)}% ({c.reason})</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsDuplicate(c.eventB.id, c.eventA.id)}
                      disabled={!!marking}
                    >
                      {marking === c.eventB.id ? '...' : 'B → дубль A'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsDuplicate(c.eventA.id, c.eventB.id)}
                      disabled={!!marking}
                    >
                      {marking === c.eventA.id ? '...' : 'A → дубль B'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
