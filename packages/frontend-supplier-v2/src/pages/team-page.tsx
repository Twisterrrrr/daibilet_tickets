import { UserPlus, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '@/shared/lib/api';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { ErrorPanel, LoadingBlock, PageHeader, SectionCard } from '@/shared/ui/page-primitives';
import { SupplierSettingsNav } from '@/shared/ui/supplier-settings-nav';

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

export function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'MANAGER' });
  const [sending, setSending] = useState(false);

  const load = () => {
    setLoading(true);
    setForbidden(false);
    setError(null);
    api
      .get<TeamData>('/supplier/invitations')
      .then(setData)
      .catch((err: Error & { message?: string }) => {
        const msg = String(err?.message ?? '').toLowerCase();
        if (msg.includes('forbidden') || msg.includes('403')) setForbidden(true);
        else setError(err?.message || 'Ошибка загрузки');
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
      const inv = await api.post<{ token: string }>('/supplier/invitations', {
        email: inviteForm.email.trim(),
        role: inviteForm.role,
      });
      const link = `${window.location.origin}/invite/${inv.token}`;
      window.alert(`Приглашение создано. Отправьте ссылку:\n${link}`);
      setInviteForm({ email: '', role: 'MANAGER' });
      load();
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.del(`/supplier/invitations/${id}`);
      load();
      window.alert('Приглашение отменено');
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Команда" glyph={<PageGlyph icon={Users} tone="mint" />} />
        <SupplierSettingsNav />
        <LoadingBlock label="Загружаем команду…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader title="Команда" glyph={<PageGlyph icon={Users} tone="mint" />} />
        <SupplierSettingsNav />
        <ErrorPanel title="Не удалось загрузить команду" description={error} onRetry={load} />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader title="Команда" glyph={<PageGlyph icon={Users} tone="mint" />} />
        <SupplierSettingsNav />
        <SectionCard title="Доступ ограничен">
          <p className="text-small text-text-secondary">Управлять командой может только владелец.</p>
        </SectionCard>
      </div>
    );
  }

  const pending = (data?.invitations || []).filter((i) => !i.acceptedAt);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Команда" glyph={<PageGlyph icon={Users} tone="mint" />} />
      <SupplierSettingsNav />

      <SectionCard title="Участники">
        <div className="space-y-2">
          {(data?.users || []).map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-card border border-border-soft px-3 py-3 text-small"
            >
              <div>
                <p className="font-medium text-text-primary">{u.name || u.email}</p>
                <p className="text-text-muted">{u.email}</p>
              </div>
              <span className="rounded-full bg-surface-alt px-2.5 py-0.5 text-[11px] font-medium">
                {ROLE_LABELS[u.role] || u.role}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Приглашения">
        {pending.length === 0 ? (
          <p className="text-small text-text-muted">Нет активных приглашений</p>
        ) : (
          <div className="space-y-2">
            {pending.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-card border border-border-soft px-3 py-3 text-small"
              >
                <div>
                  <p className="font-medium text-text-primary">{i.email}</p>
                  <p className="text-text-muted">
                    {ROLE_LABELS[i.role] || i.role} · {formatDate(i.expiresAt)}
                    {isExpired(i.expiresAt) ? <span className="ml-2 text-warning">Истекло</span> : null}
                  </p>
                </div>
                {!isExpired(i.expiresAt) ? (
                  <button
                    type="button"
                    onClick={() => void handleCancel(i.id)}
                    className="rounded-full p-2 text-text-muted hover:bg-danger-soft hover:text-danger"
                    title="Отменить"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleInvite} className="mt-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[11px] text-text-muted">Email</label>
            <input
              type="email"
              required
              placeholder="colleague@example.com"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
              className="h-9 w-[260px] rounded-control border border-border-soft px-3 text-small"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-text-muted">Роль</label>
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
              className="h-9 w-[180px] rounded-control border border-border-soft px-3 text-small"
            >
              {Object.entries(ROLE_LABELS)
                .filter(([k]) => k !== 'OWNER')
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex h-9 items-center gap-2 rounded-control bg-accent px-4 text-label font-medium text-accent-foreground disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {sending ? 'Отправка…' : 'Пригласить'}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
