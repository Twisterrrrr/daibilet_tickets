import { FileText, BarChart, RefreshCw, Receipt, QrCode, FileCheck } from 'lucide-react';

const reports = [
  { icon: BarChart, label: 'Отчёт по продажам', desc: 'с детализацией по тарифам' },
  { icon: Receipt, label: 'Реестр ваучеров', desc: 'все выданные билеты' },
  { icon: RefreshCw, label: 'Отчёт по возвратам', desc: 'полные и частичные' },
  { icon: FileText, label: 'Отчёт по комиссиям', desc: 'прозрачная экономика' },
  { icon: QrCode, label: 'Отчёт по использованию', desc: 'валидация билетов' },
  { icon: FileCheck, label: 'Акт выполненных работ', desc: 'ежемесячно' },
];

export function ReportingSection() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="container-page">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Отчётность и документы</h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Полный пакет документов для бухгалтерии. Выгрузки в XLS и PDF, отправка на почту.
            </p>

            <div className="space-y-5 mb-8">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Выплаты</h4>
                <p className="text-sm text-slate-600">
                  1 раз в месяц или по индивидуальному графику для крупных партнёров. За вычетом комиссии
                  агрегатора.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Политика отмен</h4>
                <p className="text-sm text-slate-600">
                  Стандартная или индивидуальная настройка. Возвраты рассчитываются автоматически по
                  установленным правилам.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {reports.map((r) => (
              <div
                key={r.label}
                className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md"
              >
                <r.icon className="w-5 h-5 text-amber-500 mb-3" />
                <div className="font-semibold text-sm text-slate-900 mb-1">{r.label}</div>
                <div className="text-xs text-slate-600">{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
