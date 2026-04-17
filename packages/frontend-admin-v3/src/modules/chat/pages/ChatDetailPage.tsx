import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

type Msg = { id: string; authorType: string; text: string; createdAt: string };

export function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [text, setText] = useState('');

  const q = useQuery({
    queryKey: ['admin-chat-messages', id],
    queryFn: () => adminApi.get<{ items: Msg[] }>(`/admin/chat/conversations/${id}/messages`),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });

  const send = useMutation({
    mutationFn: () => adminApi.post(`/admin/chat/conversations/${id}/messages`, { text: text.trim() }),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['admin-chat-messages', id] });
      qc.invalidateQueries({ queryKey: ['admin-support-inbox-count'] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Диалог"
        actions={
          <Link to="/admin-v3/chat" className="text-sm text-primary hover:underline">
            К списку
          </Link>
        }
      />
      <div className="space-y-3 rounded-lg border p-4">
        {(q.data?.items ?? []).map((m) => (
          <div
            key={m.id}
            className={
              m.authorType === 'ADMIN'
                ? 'ml-auto max-w-[85%] rounded-lg bg-primary/10 px-3 py-2 text-sm'
                : 'max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm'
            }
          >
            <div className="text-xs text-muted-foreground">{m.authorType}</div>
            <div className="whitespace-pre-wrap">{m.text}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {new Date(m.createdAt).toLocaleString('ru-RU')}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <textarea
          className="min-h-[80px] flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ответ…"
        />
        <Button type="button" disabled={!text.trim() || send.isPending} onClick={() => send.mutate()}>
          Отправить
        </Button>
      </div>
    </div>
  );
}

export default ChatDetailPage;