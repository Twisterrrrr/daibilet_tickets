import { useEffect, useState } from 'react';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type EventCategory = 'EXCURSION' | 'MUSEUM' | 'EVENT';

interface SourceCategoryMapping {
  id: string;
  source: string;
  externalCategoryNorm: string;
  internalCategory: EventCategory;
  createdAt: string;
  updatedAt: string;
}

interface SourceCategoryUnknown {
  id: string;
  source: string;
  externalCategoryRaw: string;
  externalCategoryNorm: string;
  firstSeenAt: string;
  lastSeenAt: string;
  hits: number;
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  EXCURSION: 'Экскурсии',
  MUSEUM: 'Музеи',
  EVENT: 'Мероприятия',
};

export function SourceCategoriesPage() {
  const [mappings, setMappings] = useState<SourceCategoryMapping[]>([]);
  const [unknowns, setUnknowns] = useState<SourceCategoryUnknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formSource, setFormSource] = useState('');
  const [formExternal, setFormExternal] = useState('');
  const [formCategory, setFormCategory] = useState<EventCategory>('EVENT');
  const [saving, setSaving] = useState(false);

  const loadAll = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      adminApi.get<SourceCategoryMapping[]>('/admin/source-categories'),
      adminApi.get<SourceCategoryUnknown[]>('/admin/source-categories/unknowns'),
    ])
      .then(([m, u]) => {
        setMappings(m);
        setUnknowns(u);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSubmit = async () => {
    if (!formSource.trim() || !formExternal.trim()) return;
    setSaving(true);
    try {
      await adminApi.put('/admin/source-categories', {
        source: formSource.trim(),
        externalCategory: formExternal.trim(),
        internalCategory: formCategory,
      });
      setFormExternal('');
      loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleUseUnknown = (u: SourceCategoryUnknown) => {
    setFormSource(u.source);
    setFormExternal(u.externalCategoryRaw || u.externalCategoryNorm);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Маппинг категорий источников</h1>
          <p className="text-muted-foreground">
            Сопоставление внешних категорий (TicketsCloud, Teplohod и др.) с внутренним EventCategory.
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="mappings">
          <TabsList>
            <TabsTrigger value="mappings">Маппинги</TabsTrigger>
            <TabsTrigger value="unknowns">
              Неизвестные ({unknowns.length > 99 ? '99+' : unknowns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mappings" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Создать / обновить правило</CardTitle>
                <CardDescription>
                  Правило действует для пары <code>source</code> + нормализованная категория.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="src-source">Источник</Label>
                    <Input
                      id="src-source"
                      placeholder="TC, TEPLOHOD, RADARIO..."
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="src-external">Внешняя категория</Label>
                    <Input
                      id="src-external"
                      placeholder="Например, Выставки"
                      value={formExternal}
                      onChange={(e) => setFormExternal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="src-internal">Внутренняя категория</Label>
                    <Select
                      value={formCategory}
                      onValueChange={(v) => setFormCategory(v as EventCategory)}
                    >
                      <SelectTrigger id="src-internal">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button size="sm" onClick={handleSubmit} disabled={saving}>
                    {saving ? 'Сохранение…' : 'Сохранить правило'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Правила маппинга</CardTitle>
                <CardDescription>{mappings.length} правил</CardDescription>
              </CardHeader>
              <CardContent>
                {mappings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Правил пока нет.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="py-1.5 pr-4 text-left font-medium">Источник</th>
                          <th className="py-1.5 pr-4 text-left font-medium">Нормализованная категория</th>
                          <th className="py-1.5 pr-4 text-left font-medium">Внутренняя категория</th>
                          <th className="py-1.5 pr-4 text-left font-medium">Обновлено</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mappings.map((m) => (
                          <tr key={m.id} className="border-b last:border-b-0">
                            <td className="py-1.5 pr-4 align-top font-mono text-xs">{m.source}</td>
                            <td className="py-1.5 pr-4 align-top font-mono text-xs">
                              {m.externalCategoryNorm}
                            </td>
                            <td className="py-1.5 pr-4 align-top">
                              <Badge variant="secondary">
                                {CATEGORY_LABELS[m.internalCategory] ?? m.internalCategory}
                              </Badge>
                            </td>
                            <td className="py-1.5 pr-4 align-top text-xs text-muted-foreground">
                              {new Date(m.updatedAt).toLocaleString('ru-RU')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unknowns">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Неизвестные категории</CardTitle>
                <CardDescription>
                  Внешние категории, для которых пока нет правил. Сортировано по популярности.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unknowns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Неизвестных категорий нет.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="py-1.5 pr-4 text-left font-medium">Источник</th>
                          <th className="py-1.5 pr-4 text-left font-medium">Сырая категория</th>
                          <th className="py-1.5 pr-4 text-left font-medium">Нормализованная</th>
                          <th className="py-1.5 pr-4 text-right font-medium">Хитов</th>
                          <th className="py-1.5 pr-4 text-left font-medium">Последний раз</th>
                          <th className="py-1.5 pr-4 text-right font-medium">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unknowns.map((u) => (
                          <tr key={u.id} className="border-b last:border-b-0">
                            <td className="py-1.5 pr-4 align-top font-mono text-xs">{u.source}</td>
                            <td className="py-1.5 pr-4 align-top text-xs">
                              {u.externalCategoryRaw || <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="py-1.5 pr-4 align-top font-mono text-xs">
                              {u.externalCategoryNorm}
                            </td>
                            <td className="py-1.5 pr-4 align-top text-right tabular-nums text-xs">
                              {u.hits}
                            </td>
                            <td className="py-1.5 pr-4 align-top text-xs text-muted-foreground">
                              {new Date(u.lastSeenAt).toLocaleString('ru-RU')}
                            </td>
                            <td className="py-1.5 pr-0 align-top text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUseUnknown(u)}
                              >
                                Создать правило
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

