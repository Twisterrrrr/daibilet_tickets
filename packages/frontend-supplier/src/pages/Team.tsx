import { useEffect, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader, SectionCard, LoadingState } from '@daibilet/shared-ui';

import { api } from '../lib/api';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Владелец',
  MANAGER: 'Менеджер',
  CONTENT: 'Контент',
  ACCOUNTANT: 'Бухгалтер',
};

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

interface TeamUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface TeamData {
  invitations: Invitation[];
  users: TeamUser[];
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt) < new Date();
}

export default function Team() {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'MANAGER' });
  const [sending, setSending] = useState(false);

  const load = () => {
    setLoading(true);
    setForbidden(false);
    api
      .get<TeamData>('/supplier/invitations')
      .then(setData)
      .catch((err: Error & { message?: string }) => {
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('forbidden') || msg.includes('403')) setForbidden(true);
        else toast.error(err?.message || 'Ошибка загрузки');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) return;
    setSending(true);
    try {
      const inv = await api.post<{ token: string; email: string }>('/supplier/invitations', {
        email: inviteForm.email.trim(),
        role: inviteForm.role,
      });
      const link = `${window.location.origin}/invite/${inv.token}`;
      toast.success(`Приглашение создано. Отправьте ссылку: ${link}`);
      setInviteForm({ email: '', role: 'MANAGER' });
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.del(`/supplier/invitations/${id}`);
      toast.success('Приглашение отменено');
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  if (loading) return <LoadingState label="Загружаем команду..." />;

  if (forbidden) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Команда" />
        <SectionCard title="Доступ ограничен">
          <p className="text-gray-600">Управлять командой может только владелец компании.</p>
        </SectionCard>
      </div>
    );
  }

  const pending = (data?.invitations || []).filter((i) => !i.acceptedAt);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Команда" />
      <SectionCard title="Участники">
        <div className="space-y-3">
          {(data?.users || []).map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium">{u.name || u.email}</p>
                <p className="text-sm text-gray-500">{u.email}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm">
                {ROLE_LABELS[u.role] || u.role}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Приглашения">
        {pending.length === 0 ? (
          <p className="text-gray-500">Нет активных приглашений</p>
        ) : (
          <div className="space-y-3">
            {pending.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div>
                  <p className="font-medium">{i.email}</p>
                  <p className="text-sm text-gray-500">
                    {ROLE_LABELS[i.role] || i.role} · {formatDate(i.expiresAt)}
                    {isExpired(i.expiresAt) && <span className="ml-2 text-amber-600">Истекло</span>}
                  </p>
                </div>
                {!isExpired(i.expiresAt) && (
                  <button
                    type="button"
                    onClick={() => handleCancel(i.id)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                    title="Отменить"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleInvite} className="mt-4 flex flex-wrap gap-3">
          <input
            type="email"
            placeholder="Email"
            value={inviteForm.email}
            onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
            className="rounded-lg border px-3 py-2 text-sm"
            required
          />
          <select
            value={inviteForm.role}
            onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {Object.entries(ROLE_LABELS)
              .filter(([k]) => k !== 'OWNER')
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {sending ? 'Отправка...' : 'Пригласить'}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
