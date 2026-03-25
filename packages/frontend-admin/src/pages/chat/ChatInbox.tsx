import { MessageSquare, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { EmptyState, ErrorState, LoadingState, PageHeader } from '@daibilet/shared-ui';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API = import.meta.env.VITE_API_URL || '/api/v1';

type ConversationStatus = 'OPEN' | 'CLOSED';

type ConversationItem = {
  id: string;
  status: ConversationStatus;
  guestName: string | null;
  guestEmail: string | null;
  userId: string | null;
  lastCustomerMessageAt: string | null;
  lastAdminMessageAt: string | null;
  updatedAt: string;
  _count: { messages: number };
};

function formatDate(d: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
}

function needsReply(c: ConversationItem): boolean {
  if (!c.lastCustomerMessageAt) return false;
  if (!c.lastAdminMessageAt) return true;
  return new Date(c.lastCustomerMessageAt) > new Date(c.lastAdminMessageAt);
}

const STATUS_LABELS: Record<ConversationStatus, string> = {
  OPEN: 'Открыт',
  CLOSED: 'Закрыт',
};

export function ChatInboxPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const status = (searchParams.get('status') || 'OPEN') as ConversationStatus | 'all';
  const search = searchParams.get('search') || '';
  const needsReplyOnly = searchParams.get('needsReply') === '1' || searchParams.get('needsReply') === 'true';

  const token = localStorage.getItem('token');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    if (needsReplyOnly) params.set('needsReply', '1');
    params.set('limit', '100');

    try {
      const res = await fetch(`${API}/admin/chat/conversations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items: ConversationItem[] };
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error('Load conversations failed:', e);
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    }
    setLoading(false);
  }, [status, search, needsReplyOnly, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    // backend already filters; keep as safety
    return items;
  }, [items]);

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value);
    else p.delete(key);
    setSearchParams(p);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Чат поддержки"
        subtitle={filtered.length > 0 ? `Диалогов: ${filtered.length}` : 'Диалогов нет'}
        actions={
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Обновить
          </Button>
        }
      />

      {loading && <LoadingState label="Загружаем диалоги..." />}
      {error && (
        <ErrorState
          title="Ошибка загрузки"
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={fetchData}>
              Повторить
            </Button>
          }
        />
      )}

      {!loading && !error && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Поиск по email/имени..."
                className="pl-9"
                value={search}
                onChange={(e) => setFilter('search', e.target.value)}
              />
            </div>

            <Select value={status} onValueChange={(v) => setFilter('status', v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Открытые</SelectItem>
                <SelectItem value="CLOSED">Закрытые</SelectItem>
                <SelectItem value="all">Все</SelectItem>
              </SelectContent>
            </Select>

            <Select value={needsReplyOnly ? '1' : '0'} onValueChange={(v) => setFilter('needsReply', v === '1' ? '1' : '')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Требует ответа</SelectItem>
                <SelectItem value="0">Все диалоги</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="Нет диалогов"
              description="Когда пользователи начнут писать в чат — они появятся здесь."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filtered.map((c) => {
                    const reply = needsReply(c);
                    const title = c.guestEmail || c.guestName || 'Гость';
                    return (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/chat/${c.id}`)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3"
                      >
                        <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-sm truncate">{title}</div>
                            {reply && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                Требует ответа
                              </span>
                            )}
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {STATUS_LABELS[c.status]}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            Обновлено: {formatDate(c.updatedAt)} · Сообщений: {c._count.messages}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400">›</div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

