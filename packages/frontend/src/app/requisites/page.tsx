import { Building2, FileText } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Реквизиты — Дайбилет',
  description: 'Реквизиты Дайбилет для заключения договоров и бухгалтерских документов',
  robots: { index: false, follow: false },
};

export default function RequisitesPage() {
  return (
    <div className="container-page py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Реквизиты</h1>
            <p className="text-sm text-slate-500">Реквизиты для заключения договоров</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-500">Название организации</p>
                <p className="font-semibold text-slate-900">
                  Индивидуальный предприниматель Бутин Василий Александрович
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">Юридический адрес</p>
              <p className="text-slate-900">
                193091, Россия, г. Санкт-Петербург, наб. Октябрьская, д. 24, корп. 1, кв. 28
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">ИНН</p>
              <p className="font-mono text-slate-900">781125361276</p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">ОГРНИП</p>
              <p className="font-mono text-slate-900">306784709000338</p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">Расчётный счёт</p>
              <p className="font-mono text-slate-900">40802810800005208699</p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">Банк</p>
              <p className="text-slate-900">АО «ТБанк»</p>
              <p className="mt-1 text-xs text-slate-500">ИНН банка: 7710140679</p>
              <p className="text-xs text-slate-500">
                127287, г. Москва, ул. Хуторская 2-я, д. 38А, стр. 26
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">БИК</p>
              <p className="font-mono text-slate-900">044525974</p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">Корреспондентский счёт</p>
              <p className="font-mono text-slate-900">30101810145250000974</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
