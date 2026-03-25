import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PageHeader } from '@daibilet/shared-ui';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const API = import.meta.env.VITE_API_URL || '/api/v1';

type ChatMessage = {
  id: string;
  authorType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  authorName: string | null;
  text: string;
  createdAt: string;
};

export function ChatConversationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');

  const token = localStorage.getItem('token');
  const listRef = useRef<HTMLDivElement>(null);

  const lastCreatedAt = useMemo(() => messages[messages.length - 1]?.createdAt || null, [messages]);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const fetchMessages = useCallback(
    async (after?: string) => {
      if (!id) return;
      const qs = after ? `?after=${encodeURIComponent(after)}` : '';
      const res = await fetch(`${API}/admin/chat/conversations/${id}/messages${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items?: ChatMessage[] };
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length > 0) {
        setMessages((prev) => (after ? [...prev, ...items] : items));
      } else if (!after) {
        setMessages([]);
      }
    },
    [id, token],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchMessages();
      } catch (e) {
        console.error('Load messages failed:', e);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMessages]);

  // Poll new messages
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      if (cancelled) return;
      void fetchMessages(lastCreatedAt || undefined).catch(() => undefined);
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, fetchMessages, lastCreatedAt]);

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [loading, messages.length]);

  const send = async () => {
    if (!id) return;
    if (!text.trim()) return;
    const msg = text.trim();
    setText('');
    setSending(true);
    try {
      const res = await fetch(`${API}/admin/chat/conversations/${id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // optimistic append (poll will de-dup by createdAt window anyway)
      setMessages((prev) => [
        ...prev,
        { id: `local_${Date.now()}`, authorType: 'ADMIN', authorName: 'Поддержка', text: msg, createdAt: new Date().toISOString() },
      ]);
    } catch (e) {
      console.error('Send message failed:', e);
      setText(msg);
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Диалог"
        subtitle={id || ''}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/chat')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div ref={listRef} className="h-[calc(100vh-220px)] min-h-[360px] overflow-y-auto bg-slate-50 p-4 space-y-3">
            {loading ? (
              <div className="py-12 flex items-center justify-center text-slate-500 gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Загрузка…
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">Сообщений пока нет.</div>
            ) : (
              messages.map((m) => {
                const mine = m.authorType === 'ADMIN';
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                        mine ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-900'
                      }`}
                    >
                      {!mine && (m.authorName || 'Клиент') && (
                        <div className="text-[11px] opacity-70 mb-1">{m.authorName || 'Клиент'}</div>
                      )}
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ответить…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button onClick={() => void send()} disabled={sending} className="shrink-0">
              <Send className="h-4 w-4 mr-1" />
              Отправить
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

