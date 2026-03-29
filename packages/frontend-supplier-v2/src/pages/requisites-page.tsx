import { Building2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { api } from '@/shared/lib/api';
import { getSupplierRoleFromToken } from '@/shared/lib/jwt-role';
import { PageGlyph } from '@/shared/ui/page-glyph';
import {
  EmptyState,
  ErrorPanel,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from '@/shared/ui/page-primitives';
import { SupplierSettingsNav } from '@/shared/ui/supplier-settings-nav';

interface LegalProfile {
  id?: string;
  legalName: string;
  legalAddress?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  financeEmail?: string | null;
  docsEmail?: string | null;
  taxMode: string;
  isVatPayer: boolean;
  defaultVatRate?: number | null;
  status: string;
  rejectionComment?: string | null;
}

interface BankAccount {
  id: string;
  bankName?: string | null;
  bik?: string | null;
  accountNumber?: string | null;
  correspondentAccount?: string | null;
  isPrimary: boolean;
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-label text-text-muted">{label}</p>
      <p className="mt-0.5 text-small text-text-primary">{value != null && value !== '' ? String(value) : '—'}</p>
    </div>
  );
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function RequisitesPage() {
  const location = useLocation();
  const scrollAccounts = location.hash === '#accounts';

  const isOwner = useMemo(() => getSupplierRoleFromToken() === 'OWNER', []);

  const [profile, setProfile] = useState<LegalProfile | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bankForm, setBankForm] = useState({
    bankName: '',
    bik: '',
    accountNumber: '',
    correspondentAccount: '',
    isPrimary: true,
  });
  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [accountActionId, setAccountActionId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<LegalProfile | null>('/supplier/profile/legal'),
      api.get<BankAccount[]>('/supplier/profile/bank-accounts'),
    ])
      .then(([p, a]) => {
        setProfile(p ?? null);
        setAccounts(Array.isArray(a) ? a : []);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (scrollAccounts && !loading) {
      document.getElementById('supplier-bank-accounts')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scrollAccounts, loading]);

  useEffect(() => {
    setBankForm((f) => ({ ...f, isPrimary: accounts.length === 0 }));
  }, [accounts.length]);

  const submitBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    const bik = digitsOnly(bankForm.bik);
    const accountNumber = digitsOnly(bankForm.accountNumber);
    const corr = digitsOnly(bankForm.correspondentAccount);
    if (bik.length !== 9) {
      window.alert('БИК должен содержать 9 цифр.');
      return;
    }
    if (accountNumber.length !== 20) {
      window.alert('Расчётный счёт должен содержать 20 цифр.');
      return;
    }
    if (bankForm.correspondentAccount.trim() && corr.length !== 20) {
      window.alert('Корреспондентский счёт должен содержать 20 цифр или оставьте поле пустым.');
      return;
    }
    setBankSubmitting(true);
    try {
      await api.post('/supplier/profile/bank-accounts', {
        bankName: bankForm.bankName.trim() || undefined,
        bik,
        accountNumber,
        correspondentAccount: corr.length === 20 ? corr : undefined,
        isPrimary: bankForm.isPrimary,
      });
      setBankForm({
        bankName: '',
        bik: '',
        accountNumber: '',
        correspondentAccount: '',
        isPrimary: false,
      });
      load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Не удалось сохранить счёт');
    } finally {
      setBankSubmitting(false);
    }
  };

  const setPrimaryAccount = async (id: string) => {
    if (!isOwner) return;
    setAccountActionId(id);
    try {
      await api.post(`/supplier/profile/bank-accounts/${id}/set-primary`);
      load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Не удалось сменить основной счёт');
    } finally {
      setAccountActionId(null);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!isOwner) return;
    if (!window.confirm('Удалить этот счёт?')) return;
    setAccountActionId(id);
    try {
      await api.del(`/supplier/profile/bank-accounts/${id}`);
      load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Не удалось удалить счёт');
    } finally {
      setAccountActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Реквизиты" glyph={<PageGlyph icon={Building2} tone="slate" />} />
        <SupplierSettingsNav />
        <LoadingBlock label="Загружаем реквизиты…" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Компания и реквизиты"
        subtitle="Просмотр юридического профиля и счетов."
        glyph={<PageGlyph icon={Building2} tone="slate" />}
      />
      <SupplierSettingsNav />

      {error ? <ErrorPanel title="Ошибка" description={error} onRetry={load} /> : null}

      {!profile ? (
        <EmptyState
          title="Профиль не заполнен"
          description="Юридические данные ещё не переданы в кабинет."
        />
      ) : (
        <SectionCard title="Юридический профиль">
          {profile.rejectionComment ? (
            <div className="mb-4 rounded-card border border-warning/30 bg-warning-soft px-3 py-2 text-small text-warning">
              Замечание модерации: {profile.rejectionComment}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Название" value={profile.legalName} />
            <Field label="Статус" value={profile.status} />
            <Field label="ИНН" value={profile.inn} />
            <Field label="КПП" value={profile.kpp} />
            <Field label="ОГРН" value={profile.ogrn} />
            <Field label="Адрес" value={profile.legalAddress} />
            <Field label="Email (финансы)" value={profile.financeEmail} />
            <Field label="Email (документы)" value={profile.docsEmail} />
            <Field label="Налоговый режим" value={profile.taxMode} />
            <Field label="Плательщик НДС" value={profile.isVatPayer ? 'Да' : 'Нет'} />
            <Field label="Ставка НДС" value={profile.defaultVatRate ?? null} />
          </div>
          <p className="mt-4 text-[11px] text-text-muted">
            Редактирование реквизитов в этой версии кабинета будет добавлено отдельно; при необходимости
            используйте классический кабинет или обратитесь в поддержку.
          </p>
        </SectionCard>
      )}

      <SectionCard
        title="Банковские счета"
        description="Расчётные счета для выплат. Добавляет владелец кабинета прямо здесь; отдельное действие администратора обычно не требуется."
      >
        <div id="supplier-bank-accounts" />
        {accounts.length === 0 ? (
          <EmptyState
            compact
            title="Счета не добавлены"
            description={
              isOwner
                ? 'Заполните форму ниже: БИК, расчётный счёт (20 цифр), при необходимости — корсчёт и название банка.'
                : 'Внести реквизиты может только владелец компании. Попросите владельца аккаунта зайти в этот раздел или обратитесь в поддержку.'
            }
          />
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="rounded-card border border-border-soft px-3 py-3 text-small"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text-primary">{acc.bankName ?? 'Банк'}</span>
                  {acc.isPrimary ? (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                      Основной
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Field label="Р/с" value={acc.accountNumber} />
                  <Field label="БИК" value={acc.bik} />
                  <Field label="К/с" value={acc.correspondentAccount} />
                </div>
                {isOwner ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!acc.isPrimary ? (
                      <button
                        type="button"
                        disabled={accountActionId !== null}
                        onClick={() => void setPrimaryAccount(acc.id)}
                        className="rounded-control border border-border-soft px-3 py-1.5 text-[11px] font-medium text-text-primary disabled:opacity-50"
                      >
                        {accountActionId === acc.id ? 'Сохранение…' : 'Сделать основным'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={accountActionId !== null}
                      onClick={() => void deleteAccount(acc.id)}
                      className="rounded-control border border-danger/30 bg-danger-soft px-3 py-1.5 text-[11px] font-medium text-danger-foreground disabled:opacity-50"
                    >
                      {accountActionId === acc.id ? 'Удаление…' : 'Удалить'}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {isOwner ? (
          <form onSubmit={(e) => void submitBankAccount(e)} className="mt-6 space-y-3 border-t border-border-soft pt-5">
            <h3 className="text-label font-medium text-text-primary">
              {accounts.length === 0 ? 'Добавить расчётный счёт' : 'Добавить ещё один счёт'}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] text-text-muted">Наименование банка (по желанию)</label>
                <input
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))}
                  className="w-full rounded-control border border-border-soft px-3 py-2 text-small outline-none focus:border-accent"
                  placeholder="Например, ПАО Сбербанк"
                  autoComplete="organization"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-text-muted">БИК *</label>
                <input
                  value={bankForm.bik}
                  onChange={(e) => setBankForm((f) => ({ ...f, bik: e.target.value }))}
                  className="w-full rounded-control border border-border-soft px-3 py-2 font-mono text-small outline-none focus:border-accent"
                  placeholder="9 цифр"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-text-muted">Расчётный счёт *</label>
                <input
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value }))}
                  className="w-full rounded-control border border-border-soft px-3 py-2 font-mono text-small outline-none focus:border-accent"
                  placeholder="20 цифр"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] text-text-muted">
                  Корреспондентский счёт (необязательно, 20 цифр)
                </label>
                <input
                  value={bankForm.correspondentAccount}
                  onChange={(e) => setBankForm((f) => ({ ...f, correspondentAccount: e.target.value }))}
                  className="w-full rounded-control border border-border-soft px-3 py-2 font-mono text-small outline-none focus:border-accent"
                  placeholder="Обычно указывают вместе с БИК"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-small text-text-primary">
              <input
                type="checkbox"
                checked={bankForm.isPrimary}
                onChange={(e) => setBankForm((f) => ({ ...f, isPrimary: e.target.checked }))}
              />
              Сделать основным для выплат
            </label>
            <button
              type="submit"
              disabled={bankSubmitting}
              className="rounded-control bg-accent px-4 py-2 text-label font-medium text-accent-foreground disabled:opacity-50"
            >
              {bankSubmitting ? 'Сохранение…' : 'Сохранить счёт'}
            </button>
          </form>
        ) : null}
      </SectionCard>
    </div>
  );
}
