import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface ExternalReview {
  id: string;
  source: string;
  sourceUrl: string | null;
  authorName: string;
  rating: number;
  text: string;
  publishedAt: string | null;
  createdAt: string;
  event: { id: string; title: string; slug: string } | null;
}

const SOURCE_LABELS: Record<string, string> = {
  yandex_maps: 'Яндекс.Карты',
  '2gis': '2ГИС',
  tripadvisor: 'Tripadvisor',
  google: 'Google',
};

function stars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export function ExternalReviewsListPage() {
  const [reviews, setReviews] = useState<ExternalReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  // Add form
  const [form, setForm] = useState({
    eventId: '',
    source: 'yandex_maps',
    sourceUrl: '',
    authorName: '',
    rating: 5,
    text: '',
    publishedAt: '',
  });
  const [batchJson, setBatchJson] = useState('');

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get<{
        items: ExternalReview[];
        total: number;
        pages: number;
      }>('/admin/external-reviews?limit=50');
      setReviews(res.items);
      setTotal(res.total);
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleAdd = async () => {
    try {
      await adminApi.post('/admin/external-reviews', {
        ...form,
        eventId: form.eventId || undefined,
        sourceUrl: form.sourceUrl || undefined,
        publishedAt: form.publishedAt || undefined,
      });
      toast.success('Внешний отзыв добавлен');
      setShowAddDialog(false);
      setForm({ eventId: '', source: 'yandex_maps', sourceUrl: '', authorName: '', rating: 5, text: '', publishedAt: '' });
      fetchReviews();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleBatchImport = async () => {
    try {
      const parsed = JSON.parse(batchJson);
      const reviews = Array.isArray(parsed) ? parsed : [parsed];
      const res = await adminApi.post<{ imported: number }>('/admin/external-reviews/batch', { reviews });
      toast.success(`Импортировано: ${res.imported}`);
      setShowBatchDialog(false);
      setBatchJson('');
      fetchReviews();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка парсинга JSON');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить внешний отзыв?')) return;
    try {
      await adminApi.delete(`/admin/external-reviews/${id}`);
      toast.success('Удалён');
      fetchReviews();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Внешние отзывы</h1>
          <p className="text-muted-foreground">{total} отзывов с внешних площадок</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBatchDialog(true)}>
            Импорт JSON
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Добавить
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-2 h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Пока нет внешних отзывов. Добавьте первый!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.authorName}</span>
                      <span className="text-amber-500 text-sm tracking-wider">{stars(r.rating)}</span>
                      <Badge variant="secondary" className="gap-1">
                        <ExternalLink className="h-3 w-3" />
                        {SOURCE_LABELS[r.source] || r.source}
                      </Badge>
                    </div>
                    {r.event && (
                      <p className="mt-1 text-xs text-primary">{r.event.title}</p>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{r.text}</p>
                    {r.sourceUrl && (
                      <a
                        href={r.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Оригинал
                      </a>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить внешний отзыв</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Event ID (UUID, опционально)</Label>
              <Input
                value={form.eventId}
                onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                placeholder="UUID события"
              />
            </div>
            <div>
              <Label>Источник</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yandex_maps">Яндекс.Карты</SelectItem>
                  <SelectItem value="2gis">2ГИС</SelectItem>
                  <SelectItem value="tripadvisor">Tripadvisor</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Автор *</Label>
              <Input
                value={form.authorName}
                onChange={(e) => setForm({ ...form, authorName: e.target.value })}
              />
            </div>
            <div>
              <Label>Рейтинг (1-5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Текст *</Label>
              <Textarea
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <Label>URL оригинала</Label>
              <Input
                value={form.sourceUrl}
                onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Дата публикации</Label>
              <Input
                type="date"
                value={form.publishedAt}
                onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Отмена</Button>
            <Button onClick={handleAdd} disabled={!form.authorName || !form.text}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch import dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Импорт внешних отзывов (JSON)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Вставьте JSON-массив отзывов. Каждый элемент: {'{'} eventId?, source, sourceUrl?, authorName, rating, text, publishedAt? {'}'}
            </p>
            <Textarea
              value={batchJson}
              onChange={(e) => setBatchJson(e.target.value)}
              rows={10}
              placeholder='[{"source": "yandex_maps", "authorName": "Иван", "rating": 5, "text": "Отлично!"}]'
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>Отмена</Button>
            <Button onClick={handleBatchImport} disabled={!batchJson.trim()}>Импортировать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
