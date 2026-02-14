import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  HeadphonesIcon, Search, Filter, Clock, AlertTriangle, CheckCircle,
  MessageSquare, ChevronRight, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API = import.meta.env.VITE_API_URL || '/api/v1';

interface Ticket {
  id: string;
  shortCode: string;
  name: string;
  email: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  orderCode: string | null;
  slaDeadline: string | null;
  createdAt: string;
  _count: { responses: number };
}

interface Stats {
  open: number;
  inProgress: number;
  waitingCustomer: number;
  resolved: number;
  closed: number;
  total: number;
  slaBreached: number;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  WAITING_CUSTOMER: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  WAITING_CUSTOMER: 'Ожидает клиента',
  RESOLVED: 'Решён',
  CLOSED: 'Закрыт',
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: '🔴 Срочный',
  HIGH: '🟠 Высокий',
  MEDIUM: '🟡 Средний',
  LOW: '🟢 Низкий',
};

const CATEGORY_LABELS: Record<string, string> = {
  ORDER: 'Заказ',
  REFUND: 'Возврат',
  VENUE: 'Место',
  TECHNICAL: 'Техника',
  OTHER: 'Другое',
};

function formatDate(d: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));
}

function isSlaBreached(slaDeadline: string | null): boolean {
  if (!slaDeadline) return false;
  return new Date(slaDeadline) < new Date();
}

export function SupportListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const status = searchParams.get('status') || '';
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = Number(searchParams.get('page') || '1');

  const token = localStorage.getItem('token');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('limit', '25');

    try {
      const [ticketsRes, statsRes] = await Promise.all([
        fetch(`${API}/admin/support/tickets?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/admin/support/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setTickets(data.items);
        setTotal(data.total);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (e) { console.error('Load tickets failed:', e); }
    setLoading(false);
  }, [status, category, search, page, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value);
    else p.delete(key);
    p.delete('page');
    setSearchParams(p);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HeadphonesIcon className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Поддержка</h1>
          {stats && stats.slaBreached > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
              <AlertTriangle className="h-3 w-3" />
              {stats.slaBreached} SLA
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Обновить
        </Button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard label="Открытые" value={stats.open} color="text-red-600" onClick={() => setFilter('status', 'OPEN')} />
          <StatCard label="В работе" value={stats.inProgress} color="text-blue-600" onClick={() => setFilter('status', 'IN_PROGRESS')} />
          <StatCard label="Ожидание" value={stats.waitingCustomer} color="text-amber-600" onClick={() => setFilter('status', 'WAITING_CUSTOMER')} />
          <StatCard label="Решены" value={stats.resolved} color="text-green-600" onClick={() => setFilter('status', 'RESOLVED')} />
          <StatCard label="SLA нарушен" value={stats.slaBreached} color="text-red-600" />
          <StatCard label="Всего" value={stats.total} color="text-slate-600" onClick={() => setFilter('status', '')} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Поиск по коду, email, имени..."
            className="pl-9"
            value={search}
            onChange={(e) => setFilter('search', e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setFilter('status', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="OPEN">Открытые</SelectItem>
            <SelectItem value="IN_PROGRESS">В работе</SelectItem>
            <SelectItem value="WAITING_CUSTOMER">Ожидание клиента</SelectItem>
            <SelectItem value="RESOLVED">Решённые</SelectItem>
            <SelectItem value="CLOSED">Закрытые</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(v) => setFilter('category', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Все категории" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            <SelectItem value="ORDER">Заказ</SelectItem>
            <SelectItem value="REFUND">Возврат</SelectItem>
            <SelectItem value="VENUE">Место</SelectItem>
            <SelectItem value="TECHNICAL">Техника</SelectItem>
            <SelectItem value="OTHER">Другое</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ticket list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Загрузка...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Тикеты не найдены</div>
          ) : (
            <div className="divide-y">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/support/${ticket.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-500">{ticket.shortCode}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status] || ''}`}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                      <span className="text-xs text-slate-500">{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                      <span className="text-xs">{PRIORITY_LABELS[ticket.priority] || ticket.priority}</span>
                      {isSlaBreached(ticket.slaDeadline) && (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') && (
                        <span className="flex items-center gap-0.5 text-xs text-red-600 font-medium">
                          <AlertTriangle className="h-3 w-3" /> SLA
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-sm text-slate-900 mt-1 truncate">{ticket.subject}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{ticket.name}</span>
                      <span>{ticket.email}</span>
                      {ticket.orderCode && <span className="font-mono">{ticket.orderCode}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-shrink-0">
                    {ticket._count.responses > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {ticket._count.responses}
                      </span>
                    )}
                    <span>{formatDate(ticket.createdAt)}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 25 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setFilter('page', String(page - 1))}
          >
            Назад
          </Button>
          <span className="text-sm text-slate-500 self-center">
            Стр. {page} из {Math.ceil(total / 25)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(total / 25)}
            onClick={() => setFilter('page', String(page + 1))}
          >
            Далее
          </Button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, onClick }: { label: string; value: number; color: string; onClick?: () => void }) {
  return (
    <Card className={`${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`} onClick={onClick}>
      <CardContent className="p-3 text-center">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </CardContent>
    </Card>
  );
}
