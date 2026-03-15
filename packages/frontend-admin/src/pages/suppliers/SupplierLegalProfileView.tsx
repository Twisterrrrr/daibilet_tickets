import { useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ProfileStatus = 'DRAFT' | 'INCOMPLETE' | 'VERIFIED' | 'REJECTED';

interface BankAccount {
  id: string;
  bankName: string | null;
  bik: string | null;
  accountNumber: string | null;
  correspondentAccount: string | null;
  isPrimary: boolean;
}

interface LegalProfile {
  id: string;
  operatorId: string;
  legalName: string;
  legalAddress: string | null;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  financeEmail: string | null;
  docsEmail: string | null;
  signerFullName: string | null;
  signerPosition: string | null;
  status: ProfileStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionComment: string | null;
  updatedAt?: string;
  bankAccounts: BankAccount[];
}

interface SupplierLegalProfileViewProps {
  operatorId: string;
}

export function SupplierLegalProfileView({ operatorId }: SupplierLegalProfileViewProps) {
  const [profile, setProfile] = useState<LegalProfile | null | undefined>(undefined);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    adminApi
      .get<LegalProfile | null>(`/admin/finance/suppliers/profiles/${operatorId}`)
      .then((data) => setProfile(data ?? null))
      .catch(() => setProfile(null));
  }, [operatorId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await adminApi.patch(`/admin/finance/suppliers/profiles/${operatorId}/status`, {
        status: 'VERIFIED',
      });
      toast.success('Профиль одобрен');
      setSubmitting(false);
      load();
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRejectSubmit = async () => {
    const comment = rejectComment.trim();
    if (!comment) {
      toast.error('Укажите причину отказа');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.patch(`/admin/finance/suppliers/profiles/${operatorId}/status`, {
        status: 'REJECTED',
        comment,
      });
      toast.success('Профиль отклонён');
      setSubmitting(false);
      setRejectOpen(false);
      setRejectComment('');
      load();
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  if (profile === undefined) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse text-muted-foreground">Загрузка реквизитов...</div>
        </CardContent>
      </Card>
    );
  }

  if (profile === null) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            Реквизиты ещё не заполнены. Поставщик должен указать юридические данные и банковские счета в своём
            личном кабинете.
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusVariant =
    profile.status === 'VERIFIED'
      ? 'success'
      : profile.status === 'REJECTED'
        ? 'destructive'
        : 'warning';
  const statusLabel =
    profile.status === 'VERIFIED'
      ? 'Проверено'
      : profile.status === 'REJECTED'
        ? 'Отклонено'
        : profile.status === 'INCOMPLETE'
          ? 'На проверку'
          : 'Черновик';

  const timelineEntries: { date: string; role: string; text: string }[] = [];
  if (profile.verifiedAt) {
    timelineEntries.push({
      date: profile.verifiedAt,
      role: 'ADMIN',
      text: 'Профиль одобрен',
    });
  }
  if (profile.status === 'REJECTED' && profile.rejectionComment) {
    timelineEntries.push({
      date: profile.updatedAt ?? profile.verifiedAt ?? '',
      role: 'ADMIN',
      text: `Отклонено. Причина: ${profile.rejectionComment}`,
    });
  }
  const hasUpdatedAt = profile.updatedAt;
  if (hasUpdatedAt && timelineEntries.length === 0) {
    timelineEntries.push({
      date: hasUpdatedAt,
      role: '—',
      text: 'Профиль обновлён',
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Статус</h3>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Юридические данные</h4>
              <dl className="space-y-1 text-sm">
                <div>
                  <dt className="text-muted-foreground">Название</dt>
                  <dd>{profile.legalName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">ИНН</dt>
                  <dd>{profile.inn || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">КПП</dt>
                  <dd>{profile.kpp || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">ОГРН</dt>
                  <dd>{profile.ogrn || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Адрес</dt>
                  <dd>{profile.legalAddress || '—'}</dd>
                </div>
              </dl>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Контакты для документов</h4>
              <dl className="space-y-1 text-sm">
                <div>
                  <dt className="text-muted-foreground">Email (финансы)</dt>
                  <dd>{profile.financeEmail || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email (документы)</dt>
                  <dd>{profile.docsEmail || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Подписант</dt>
                  <dd>{profile.signerFullName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Должность</dt>
                  <dd>{profile.signerPosition || '—'}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Банковские счета</h4>
            {profile.bankAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет добавленных счетов</p>
            ) : (
              <ul className="space-y-2">
                {profile.bankAccounts.map((acc) => (
                  <li
                    key={acc.id}
                    className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                  >
                    {acc.isPrimary && (
                      <span title="Основной">
                        <Star className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" />
                      </span>
                    )}
                    <span className="font-medium">{acc.bankName || 'Банк не указан'}</span>
                    <span className="text-muted-foreground">
                      {acc.accountNumber ? `••• ${acc.accountNumber.slice(-4)}` : '—'}
                    </span>
                    {acc.isPrimary && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        Основной
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {timelineEntries.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">История</h4>
              <div className="relative border-l-2 border-muted pl-4">
                {timelineEntries.map((entry, i) => (
                  <div key={i} className="relative pb-3 last:pb-0">
                    <span className="absolute -left-[1.35rem] flex h-3 w-3 items-center justify-center rounded-full bg-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.date).toLocaleString('ru')} · {entry.role}
                    </p>
                    <p className="text-sm">{entry.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {profile.status !== 'VERIFIED' && (
          <Button onClick={handleApprove} disabled={submitting}>
            Одобрить
          </Button>
        )}
        <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={submitting}>
          Отклонить
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить профиль</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Укажите причину отказа. Она будет видна поставщику в личном кабинете.
          </p>
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Например: неверный ИНН, неполный адрес..."
            className="min-h-[100px] w-full rounded-lg border px-3 py-2 text-sm"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={submitting}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmit} disabled={submitting || !rejectComment.trim()}>
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
