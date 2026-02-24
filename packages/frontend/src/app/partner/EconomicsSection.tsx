'use client';

import { useState } from 'react';

const scenarios = [
  { label: '100 билетов', tickets: 100 },
  { label: '500 билетов', tickets: 500 },
  { label: '1 000 билетов', tickets: 1000 },
];

const avgChecks = [
  { label: 'Музей — 800 ₽', value: 800 },
  { label: 'Экскурсия — 2 500 ₽', value: 2500 },
  { label: 'Мероприятие — 5 000 ₽', value: 5000 },
];

const formatNumber = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

export function EconomicsSection() {
  const [checkIdx, setCheckIdx] = useState(1);
  const avgCheck = avgChecks[checkIdx].value;
  const promoRate = 0.1;
  const standardRate = 0.25;

  return (
    <section className="py-24 bg-slate-50">
      <div className="container-page">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            Экономика сотрудничества
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Прозрачный расчёт — сколько вы зарабатываете при промо-комиссии 10%
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {avgChecks.map((c, i) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setCheckIdx(i)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                checkIdx === i
                  ? 'gradient-gold text-slate-900 shadow-gold'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary-600 text-white">
                  <th className="text-left px-6 py-4 font-semibold text-sm">Объём / мес</th>
                  <th className="text-right px-6 py-4 font-semibold text-sm">Выручка</th>
                  <th className="text-right px-6 py-4 font-semibold text-sm">Комиссия (10%)</th>
                  <th className="text-right px-6 py-4 font-semibold text-sm">Ваш доход</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => {
                  const gross = s.tickets * avgCheck;
                  const commission = gross * promoRate;
                  const income = gross - commission;
                  return (
                    <tr key={s.label} className="border-t border-slate-200 bg-white hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{s.label}</td>
                      <td className="px-6 py-4 text-right text-slate-600">{formatNumber(gross)}</td>
                      <td className="px-6 py-4 text-right text-slate-600">{formatNumber(commission)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 text-lg">
                        {formatNumber(income)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="max-w-3xl mx-auto mt-12 p-8 rounded-2xl bg-primary-600 text-white">
          <h3 className="text-xl font-bold mb-4">Выгода промо-периода</h3>
          <p className="text-white/70 mb-6 text-sm">
            Сравнение при 500 билетах/мес, средний чек {formatNumber(avgCheck)}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
                Стандартная (25%)
              </div>
              <div className="text-2xl font-bold">{formatNumber(500 * avgCheck * standardRate)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-white/50 mb-1">Промо (10%)</div>
              <div className="text-2xl font-bold text-amber-300">{formatNumber(500 * avgCheck * promoRate)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-white/50 mb-1">Ваша экономия / мес</div>
              <div className="text-2xl font-bold text-amber-300">
                {formatNumber(500 * avgCheck * (standardRate - promoRate))}
              </div>
            </div>
          </div>
          <p className="text-sm text-white/50 mt-4">
            За 3 месяца промо-периода —{' '}
            {formatNumber(3 * 500 * avgCheck * (standardRate - promoRate))} дополнительной прибыли.
          </p>
        </div>
      </div>
    </section>
  );
}
