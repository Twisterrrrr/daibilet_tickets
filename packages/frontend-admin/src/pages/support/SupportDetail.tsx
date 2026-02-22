import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  MessageSquare,
  Send,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const API = import.meta.env.VITE_API_URL || '/api/v1';

interface Response {
  id: string;
  authorType: string;
  authorName: string | null;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

interface Ticket {
  id: string;
  shortCode: string;
  name: string;
  email: string;
  phone: string | null;
  category: string;
  priority: string;
  status: string;
  subject: string;
  message: string;
  orderCode: string | null;
  assignedTo: string | null;
  slaDeadline: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  responses: Response[];
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыт',
  IN_PROGRESS: 'В работе',
  WAITING_CUSTOMER: 'Ожидает клиента',
  RESOLVED: 'Решён',
  CLOSED: 'Закрыт',
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Срочный',
  HIGH: 'Высокий',
  MEDIUM: 'Средний',
  LOW: 'Низкий',
};

const CATEGORY_LABELS: Record<string, string> = {
  ORDER: 'Вопрос по заказу',
  REFUND: 'Возврат билета',
  VENUE: 'Вопрос о месте',
  TECHNICAL: 'Техническая проблема',
  OTHER: 'Другое',
};

// Quick reply templates
const TEMPLATES = [
  {
    label: 'Принято в работу',
    text: 'Здравствуйте! Спасибо за обращение. Ваш вопрос принят в работу, мы разберёмся и вернёмся с ответом.',
  },
  {
    label: 'Требуется код заказа',
    text: 'Пожалуйста, уточните код заказа (формат CS-XXXX) — он указан в email-подтверждении. Это поможет нам быстрее найти информацию.',
  },
  {
    label: 'Возврат инструкция',
    text: 'Для оформления возврата билета, пожалуйста, перейдите на сайт оператора, через который был оформлен заказ. Ссылка на оператора указана в вашем электронном билете.',
  },
  {
    label: 'Проблема решена',
    text: 'Рады сообщить, что ваш вопрос решён! Если остались дополнительные вопросы — не стесняйтесь обращаться.',
  },
  {
    label: 'Билет отправлен повторно',
    text: 'Мы повторно отправили электронный билет на ваш email. Если письмо не пришло — проверьте папку «Спам».',
  },
];

function formatDate(d: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
}

export function SupportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const token = localStorage.getItem('token');

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/support/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTicket(await res.json());
    } catch (e) {
      console.error('Load ticket failed:', e);
    }
    setLoading(false);
  }, [id, token]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const updateStatus = async (newStatus: string) => {
    try {
      await fetch(`${API}/admin/support/tickets/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTicket();
    } catch (e) {
      console.error('Update status failed:', e);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await fetch(`${API}/admin/support/tickets/${id}/reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText,
          isInternal,
          authorName: 'Администратор',
        }),
      });
      setReplyText('');
      setIsInternal(false);
      fetchTicket();
    } catch (e) {
      console.error('Send reply failed:', e);
    }
    setSending(false);
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Загрузка...</div>;
  if (!ticket) return <div className="p-8 text-center text-red-500">Тикет не найден</div>;

  const isSlaBreached =
    ticket.slaDeadline &&
    new Date(ticket.slaDeadline) < new Date() &&
    (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/support')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Назад
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            {ticket.shortCode}
            {isSlaBreached && (
              <span className="flex items-center gap-1 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" /> SLA нарушен
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500">{ticket.subject}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Original message */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">{ticket.name}</p>
                  <p className="text-xs text-slate-500">{formatDate(ticket.createdAt)}</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.message}</p>
            </CardContent>
          </Card>

          {/* Responses */}
          {ticket.responses.map((resp) => (
            <Card key={resp.id} className={resp.isInternal ? 'border-amber-200 bg-amber-50/50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      resp.authorType === 'admin'
                        ? 'bg-green-100 text-green-600'
                        : resp.authorType === 'system'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {resp.authorType === 'admin' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : resp.authorType === 'system' ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{resp.authorName || resp.authorType}</p>
                    <p className="text-xs text-slate-500">{formatDate(resp.createdAt)}</p>
                  </div>
                  {resp.isInternal && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                      <EyeOff className="h-3 w-3" />
                      Внутренняя заметка
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{resp.message}</p>
              </CardContent>
            </Card>
          ))}

          {/* Reply box */}
          {ticket.status !== 'CLOSED' && (
            <Card>
              <CardContent className="p-4 space-y-3">
                {/* Quick templates */}
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => setReplyText(t.text)}
                      className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Написать ответ..."
                  rows={4}
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    <EyeOff className="h-4 w-4 text-amber-500" />
                    Внутренняя заметка
                  </label>
                  <Button onClick={sendReply} disabled={sending || !replyText.trim()}>
                    <Send className="h-4 w-4 mr-1" />
                    {isInternal ? 'Добавить заметку' : 'Отправить'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - ticket info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Статус</p>
                <Select value={ticket.status} onValueChange={(v) => updateStatus(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Открыт</SelectItem>
                    <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                    <SelectItem value="WAITING_CUSTOMER">Ожидает клиента</SelectItem>
                    <SelectItem value="RESOLVED">Решён</SelectItem>
                    <SelectItem value="CLOSED">Закрыт</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-slate-500 text-xs">Категория</p>
                <p className="font-medium">{CATEGORY_LABELS[ticket.category] || ticket.category}</p>
              </div>

              <div>
                <p className="text-slate-500 text-xs">Приоритет</p>
                <p className="font-medium">{PRIORITY_LABELS[ticket.priority] || ticket.priority}</p>
              </div>

              <div>
                <p className="text-slate-500 text-xs">Клиент</p>
                <p className="font-medium">{ticket.name}</p>
                <p className="text-slate-500">{ticket.email}</p>
                {ticket.phone && <p className="text-slate-500">{ticket.phone}</p>}
              </div>

              {ticket.orderCode && (
                <div>
                  <p className="text-slate-500 text-xs">Код заказа</p>
                  <p className="font-mono font-medium">{ticket.orderCode}</p>
                </div>
              )}

              <div>
                <p className="text-slate-500 text-xs">Создан</p>
                <p className="font-medium">{formatDate(ticket.createdAt)}</p>
              </div>

              {ticket.slaDeadline && (
                <div>
                  <p className="text-slate-500 text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" /> SLA дедлайн
                  </p>
                  <p className={`font-medium ${isSlaBreached ? 'text-red-600' : ''}`}>
                    {formatDate(ticket.slaDeadline)}
                  </p>
                </div>
              )}

              {ticket.resolvedAt && (
                <div>
                  <p className="text-slate-500 text-xs">Решён</p>
                  <p className="font-medium">{formatDate(ticket.resolvedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Действия</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ticket.status === 'OPEN' && (
                <Button className="w-full" size="sm" onClick={() => updateStatus('IN_PROGRESS')}>
                  Взять в работу
                </Button>
              )}
              {(ticket.status === 'IN_PROGRESS' || ticket.status === 'WAITING_CUSTOMER') && (
                <Button className="w-full" size="sm" variant="outline" onClick={() => updateStatus('RESOLVED')}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Решено
                </Button>
              )}
              {ticket.status === 'RESOLVED' && (
                <Button className="w-full" size="sm" variant="outline" onClick={() => updateStatus('CLOSED')}>
                  Закрыть
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
