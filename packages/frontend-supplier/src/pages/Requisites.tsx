import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { FormActions, FormGrid, FormSection, LoadingState, PageHeader, SectionCard } from '@daibilet/shared-ui';
import { SupplierSettingsNav } from '@/components/layout/SupplierSettingsNav';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '../lib/api';

const TAX_MODES = [
  { value: 'OSNO', label: 'ОСНО' },
  { value: 'USN_6', label: 'УСН 6%' },
  { value: 'USN_15', label: 'УСН 15%' },
  { value: 'AUSN', label: 'АУСН' },
  { value: 'NPD', label: 'НПД' },
];

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

export default function Requisites() {
  const location = useLocation();
  const scrollToAccounts = location.hash === '#accounts';
  const [profile, setProfile] = useState<LegalProfile | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Partial<LegalProfile>>({});
  const [newAccount, setNewAccount] = useState({
    bankName: '',
    bik: '',
    accountNumber: '',
    correspondentAccount: '',
  });
  const [addingAccount, setAddingAccount] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<LegalProfile | null>('/supplier/profile/legal'),
      api.get<BankAccount[]>('/supplier/profile/bank-accounts'),
    ])
      .then(([p, a]) => {
        setProfile(p ?? null);
        setAccounts(Array.isArray(a) ? a : []);
        if (p) {
          setForm({
            legalName: p.legalName ?? '',
            legalAddress: p.legalAddress ?? '',
            inn: p.inn ?? '',
            kpp: p.kpp ?? '',
            ogrn: p.ogrn ?? '',
            financeEmail: p.financeEmail ?? '',
            docsEmail: p.docsEmail ?? '',
            taxMode: p.taxMode ?? 'OSNO',
            isVatPayer: p.isVatPayer ?? false,
            defaultVatRate: p.defaultVatRate != null ? Number(p.defaultVatRate) : null,
          });
        } else {
          setForm({
            legalName: '',
            legalAddress: '',
            inn: '',
            kpp: '',
            ogrn: '',
            financeEmail: '',
            docsEmail: '',
            taxMode: 'OSNO',
            isVatPayer: false,
            defaultVatRate: null,
          });
        }
      })
      .catch(() => toast.error('Не удалось загрузить данные'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (scrollToAccounts && !loading) {
      document.getElementById('accounts')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scrollToAccounts, loading]);

  const set = (key: keyof LegalProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/supplier/profile/legal', {
        ...form,
        defaultVatRate: form.isVatPayer && form.defaultVatRate != null ? form.defaultVatRate : undefined,
      });
      toast.success('Профиль сохранён');
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/supplier/profile/submit');
      toast.success('Профиль отправлен на проверку');
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.bik || !newAccount.accountNumber) {
      toast.error('Укажите БИК и номер счёта');
      return;
    }
    setAddingAccount(true);
    try {
      await api.post('/supplier/profile/bank-accounts', {
        bankName: newAccount.bankName || undefined,
        bik: newAccount.bik,
        accountNumber: newAccount.accountNumber,
        correspondentAccount: newAccount.correspondentAccount || undefined,
      });
      toast.success('Счёт добавлен');
      setNewAccount({ bankName: '', bik: '', accountNumber: '', correspondentAccount: '' });
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Ошибка добавления счёта');
    } finally {
      setAddingAccount(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await api.post(`/supplier/profile/bank-accounts/${id}/set-primary`);
      toast.success('Основной счёт обновлён');
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Ошибка');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Удалить этот счёт?')) return;
    try {
      await api.del(`/supplier/profile/bank-accounts/${id}`);
      toast.success('Счёт удалён');
      load();
    } catch (err: any) {
      toast.error(err.message ?? 'Ошибка удаления');
    }
  };

  if (loading && !profile && accounts.length === 0) {
    return <LoadingState label="Загружаем реквизиты..." />;
  }

  const statusLabel =
    { DRAFT: 'Черновик', INCOMPLETE: 'На проверке', VERIFIED: 'Верифицирован', REJECTED: 'Отклонён' }[
      profile?.status ?? 'DRAFT'
    ] ?? profile?.status;
  const canSubmit =
    profile &&
    profile.status !== 'VERIFIED' &&
    form.legalName?.trim() &&
    form.inn?.trim() &&
    accounts.some((a) => a.isPrimary) &&
    (form.taxMode !== 'NPD' || !form.isVatPayer) &&
    (!form.isVatPayer || (form.defaultVatRate != null && form.defaultVatRate > 0));

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Реквизиты для выплат" />
      <SupplierSettingsNav />

      {profile && (
        <SectionCard>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Статус:</span>
            <Badge
              variant="secondary"
              className={
                profile.status === 'VERIFIED'
                  ? 'bg-emerald-50 text-emerald-700'
                  : profile.status === 'REJECTED'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-amber-50 text-amber-800'
              }
            >
              {statusLabel}
            </Badge>
            {profile.rejectionComment && (
              <p className="text-sm text-red-600">{profile.rejectionComment}</p>
            )}
          </div>
        </SectionCard>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <FormSection title="Юридический профиль">
          <FormGrid>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Юридическое наименование *</label>
              <Input value={form.legalName ?? ''} onChange={set('legalName')} required />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Юридический адрес</label>
              <Input value={form.legalAddress ?? ''} onChange={set('legalAddress')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">ИНН *</label>
              <Input value={form.inn ?? ''} onChange={set('inn')} placeholder="10 или 12 цифр" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">КПП</label>
              <Input value={form.kpp ?? ''} onChange={set('kpp')} placeholder="9 цифр" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">ОГРН</label>
              <Input value={form.ogrn ?? ''} onChange={set('ogrn')} placeholder="13 или 15 цифр" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email для финансов</label>
              <Input type="email" value={form.financeEmail ?? ''} onChange={set('financeEmail')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email для документов</label>
              <Input type="email" value={form.docsEmail ?? ''} onChange={set('docsEmail')} />
            </div>
          </FormGrid>
          <div className="mt-4 space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Налогообложение</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Режим</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={form.taxMode ?? 'OSNO'}
                  onChange={set('taxMode')}
                >
                  {TAX_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isVatPayer ?? false}
                    onChange={set('isVatPayer')}
                    disabled={form.taxMode === 'NPD'}
                  />
                  <span className="text-sm">Плательщик НДС</span>
                </label>
              </div>
              {form.isVatPayer && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Ставка НДС, %</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={form.defaultVatRate ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, defaultVatRate: e.target.value ? Number(e.target.value) : null }))
                    }
                  />
                </div>
              )}
            </div>
          </div>
          <FormActions
            primary={
              <Button type="submit" disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить профиль'}
              </Button>
            }
          />
        </FormSection>
      </form>

      <SectionCard title="Банковские счета">
        <div id="accounts" />
        {accounts.length > 0 ? (
          <ul className="mb-4 space-y-2">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"
              >
                <div>
                  <span className="font-mono text-sm">{a.accountNumber ?? '—'}</span>
                  {a.bankName && <p className="text-xs text-slate-500">{a.bankName}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {a.isPrimary && (
                    <Badge variant="secondary" className="text-xs">
                      Основной
                    </Badge>
                  )}
                  {!a.isPrimary && (
                    <Button variant="outline" size="sm" onClick={() => handleSetPrimary(a.id)}>
                      Сделать основным
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteAccount(a.id)}
                  >
                    Удалить
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-slate-500">Пока нет добавленных счетов.</p>
        )}
        <form onSubmit={handleAddAccount} className="space-y-3 rounded-lg border border-dashed border-slate-200 p-4">
          <p className="text-sm font-medium">Добавить счёт</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Банк</label>
              <Input
                value={newAccount.bankName}
                onChange={(e) => setNewAccount((p) => ({ ...p, bankName: e.target.value }))}
                placeholder="Название банка"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">БИК *</label>
              <Input
                value={newAccount.bik}
                onChange={(e) => setNewAccount((p) => ({ ...p, bik: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                placeholder="9 цифр"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Расчётный счёт *</label>
              <Input
                value={newAccount.accountNumber}
                onChange={(e) =>
                  setNewAccount((p) => ({ ...p, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 20) }))
                }
                placeholder="20 цифр"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Корр. счёт</label>
              <Input
                value={newAccount.correspondentAccount}
                onChange={(e) =>
                  setNewAccount((p) => ({
                    ...p,
                    correspondentAccount: e.target.value.replace(/\D/g, '').slice(0, 20),
                  }))
                }
                placeholder="20 цифр"
              />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={addingAccount}>
            {addingAccount ? 'Добавляем...' : 'Добавить счёт'}
          </Button>
        </form>
      </SectionCard>

      {canSubmit && (
        <SectionCard>
          <p className="mb-3 text-sm text-slate-600">
            Проверьте данные и отправьте профиль на верификацию. Обычно проверка занимает 1–3 рабочих дня.
          </p>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Отправка...' : 'Отправить на проверку'}
          </Button>
        </SectionCard>
      )}
    </div>
  );
}
