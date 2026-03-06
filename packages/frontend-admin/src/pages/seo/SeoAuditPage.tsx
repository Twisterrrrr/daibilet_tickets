import { ChevronDown, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getSeoAuditEvents } from '@/api/seoAudit';
import type { SeoAuditEventRowDto } from '@/api/seoAudit';
import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const SOURCE_OPTIONS = [
  { value: '', label: 'Все источники' },
  { value: 'TC', label: 'TicketsCloud' },
  { value: 'TEPLOHOD', label: 'Теплоход' },
  { value: 'MANUAL', label: 'Ручной ввод' },
];

function formatRelative(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн. назад`;
  return d.toLocaleDateString('ru-RU');
}

export function SeoAuditPage() {
  const [items, setItems] = useState<SeoAuditEventRowDto[]>([]);
  const [summary, setSummary] = useState<{
    totalEvents: number;
    eventsWithIssues: number;
    issuesTotal: number;
    issuesBySeverity: { ERROR: number; WARN: number; INFO: number };
  } | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [cityId, setCityId] = useState('');
  const [source, setSource] = useState('');
  const [isActive, setIsActive] = useState('');
  const [hasFutureSessions, setHasFutureSessions] = useState('');
  const [onlyIssues, setOnlyIssues] = useState(true);
  const [limit, setLimit] = useState(20);
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getSeoAuditEvents({
      search: search || undefined,
      cityId: cityId || undefined,
      source: source || undefined,
      isActive: isActive === 'true' ? 'true' : isActive === 'false' ? 'false' : undefined,
      hasFutureSessions: hasFutureSessions === 'true' ? 'true' : hasFutureSessions === 'false' ? 'false' : undefined,
      onlyIssues: onlyIssues ? 'true' : 'false',
      page: String(page),
      limit: String(limit),
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setSummary(res.summary);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [search, cityId, source, isActive, hasFutureSessions, onlyIssues, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminApi
      .get<{ items?: Array<{ id: string; name: string }> }>('/admin/cities?limit=500')
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items ?? [];
        setCities(list.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      })
      .catch(() => {});
  }, []);

  const handleSearch = () => setSearch(searchInput);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">SEO Audit</h1>
        <p className="text-muted-foreground">Аудит событий: мета, индексируемость, качество контента</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Поиск и фильтрация событий для аудита</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2">
            <Input
              placeholder="Поиск по названию или slug"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-64"
            />
            <Button onClick={handleSearch} variant="secondary" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Select value={source || '__all__'} onValueChange={(v) => setSource(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Источник" />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((o) => (
                <SelectItem key={o.value || '__all__'} value={o.value || '__all__'}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cityId || '__all__'} onValueChange={(v) => setCityId(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Город" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Все города</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={isActive || '__all__'} onValueChange={(v) => setIsActive(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Активно" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Все</SelectItem>
              <SelectItem value="true">Активные</SelectItem>
              <SelectItem value="false">Неактивные</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={hasFutureSessions || '__all__'}
            onValueChange={(v) => setHasFutureSessions(v === '__all__' ? '' : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Сеансы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Все</SelectItem>
              <SelectItem value="true">Есть будущие</SelectItem>
              <SelectItem value="false">Нет будущих</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={onlyIssues}
              onChange={(e) => setOnlyIssues(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">Только с проблемами</span>
          </label>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="ml-1">Обновить</span>
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">Событий: {summary.totalEvents}</span>
          <span className="text-muted-foreground">С проблемами: {summary.eventsWithIssues}</span>
          <Badge variant="destructive">ERROR: {summary.issuesBySeverity.ERROR}</Badge>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            WARN: {summary.issuesBySeverity.WARN}
          </Badge>
          <Badge variant="outline">INFO: {summary.issuesBySeverity.INFO}</Badge>
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={load} className="mt-2">
              Повторить
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {onlyIssues ? 'Проблем не найдено' : 'Ничего не найдено'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((row) => (
            <Card key={row.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/events/${row.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.title}
                      </Link>
                      <Link to={`/events/${row.id}`} className="text-muted-foreground hover:text-primary">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.slug} · обновлено {formatRelative(row.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">{row.cityName}</span>
                    <Badge variant="outline">{row.source}</Badge>
                    {row.isActive ? (
                      <Badge variant="default">Активно</Badge>
                    ) : (
                      <Badge variant="secondary">Неактивно</Badge>
                    )}
                    <span className="text-sm">Сеансы: {row.sessionsFutureCount}</span>
                    {row.issueCounts.ERROR > 0 && (
                      <Badge variant="destructive">ERROR {row.issueCounts.ERROR}</Badge>
                    )}
                    {row.issueCounts.WARN > 0 && (
                      <Badge className="bg-amber-100 text-amber-800">WARN {row.issueCounts.WARN}</Badge>
                    )}
                    {row.issueCounts.INFO > 0 && (
                      <Badge variant="outline">INFO {row.issueCounts.INFO}</Badge>
                    )}
                    <Button asChild size="sm">
                      <Link to={`/events/${row.id}`}>Открыть</Link>
                    </Button>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {row.issues.slice(0, 3).map((issue, i) => (
                    <div
                      key={i}
                      className={`text-sm ${
                        issue.severity === 'ERROR'
                          ? 'text-red-600'
                          : issue.severity === 'WARN'
                            ? 'text-amber-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {issue.message}
                      {issue.hint && (
                        <span className="ml-1 text-muted-foreground">— {issue.hint}</span>
                      )}
                    </div>
                  ))}
                  {row.issues.length > 3 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground"
                        onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                      >
                        +{row.issues.length - 3} ещё{' '}
                        <ChevronDown
                          className={`ml-0.5 h-3 w-3 transition-transform ${expandedRow === row.id ? 'rotate-180' : ''}`}
                        />
                      </Button>
                      {expandedRow === row.id && (
                        <div className="mt-1 space-y-1">
                          {row.issues.slice(3).map((issue, i) => (
                            <div
                              key={i}
                              className={`text-sm ${
                                issue.severity === 'ERROR'
                                  ? 'text-red-600'
                                  : issue.severity === 'WARN'
                                    ? 'text-amber-600'
                                    : 'text-muted-foreground'
                              }`}
                            >
                              {issue.message}
                              {issue.hint && (
                                <span className="ml-1 text-muted-foreground">— {issue.hint}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && total > limit && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Назад
          </Button>
          <span className="flex items-center px-2 text-sm text-muted-foreground">
            {page} / {Math.ceil(total / limit)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(total / limit)}
            onClick={() => setPage((p) => p + 1)}
          >
            Вперёд
          </Button>
        </div>
      )}
    </div>
  );
}
