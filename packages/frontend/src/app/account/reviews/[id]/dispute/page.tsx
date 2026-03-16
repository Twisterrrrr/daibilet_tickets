'use client';

import { Loader2, MessageCircle } from 'lucide-react';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api';
import { getStoredToken } from '@/lib/user-auth';
import { useUserAuth } from '@/hooks/useUserAuth';

type DisputeMessage = {
  id: string;
  authorType: 'USER' | 'MODERATOR' | 'SUPPLIER';
  authorLabel: string;
  body: string;
  createdAt: string;
  isMine: boolean;
};

type DisputeResponse = {
  status: string | null;
  canReply: boolean;
  messages: DisputeMessage[];
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function getStatusLabel(status: string | null) {
  if (!status) return 'Нет спора';
  if (status === 'MODERATOR_REVIEW') return 'На рассмотрении модератора';
  if (status.startsWith('RESOLVED')) return 'Спор закрыт';
  return 'Статус спора';
}

export default function ReviewDisputePage() {
  const params = useParams<{ id: string }>();
  const reviewId = params?.id;
  const { token } = useUserAuth();

  const [data, setData] = useState<DisputeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!reviewId) return;
    const t = token ?? getStoredToken();
    if (!t) return;
    setLoading(true);
    api
      .getAccountReviewDispute(reviewId, t)
      .then((res) => {
        setData(res);
        return api.postAccountReviewDisputeRead(reviewId, t).catch(() => undefined);
      })
      .catch(() => setError('Не удалось загрузить спор'))
      .finally(() => setLoading(false));
  }, [reviewId, token]);

  const sortedMessages = useMemo(
    () => (data?.messages ?? []).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [data],
  );

  if (!reviewId) {
    notFound();
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-900">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const handleSend = async () => {
    const text = message.trim();
    if (!text || !reviewId) return;
    const t = token ?? getStoredToken();
    if (!t) return;
    setSending(true);
    try {
      const msg = await api.postAccountReviewDisputeMessage(reviewId, text, t);
      setData((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, msg],
            }
          : prev,
      );
      setMessage('');
    } catch {
      // swallow, можно добавить toast
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Спор по отзыву</h1>
            <p className="text-sm text-slate-600">
              Переписка с поддержкой и поставщиком по вашему отзыву.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Статус спора: <span className="font-medium">{getStatusLabel(data.status)}</span>
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {sortedMessages.length === 0 ? (
            <p className="text-sm text-slate-500">Сообщений пока нет.</p>
          ) : (
            sortedMessages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.isMine ? 'bg-primary-50 text-slate-900' : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <div className="mb-0.5 text-[11px] font-medium text-slate-500">
                    {m.authorLabel} · {formatTime(m.createdAt)}
                  </div>
                  <div>{m.body}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4">
          {data.canReply ? (
            <div className="space-y-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Напишите ответ…"
                className="min-h-24 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">
                  Ответ увидит модератор и поставщик. Пишите по делу и вежливо.
                </p>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Отправить
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Спор закрыт. Новые сообщения недоступны.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

