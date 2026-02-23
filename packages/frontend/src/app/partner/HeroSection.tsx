import { ArrowRight, Ticket, Building2, Users } from 'lucide-react';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="gradient-hero relative overflow-hidden min-h-[85vh] flex items-center">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" />
      </div>

      <div className="container-page relative z-10 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8">
            <span className="w-2 h-2 rounded-full gradient-gold" />
            <span className="text-sm text-white/70 font-medium">Для поставщиков и операторов</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight mb-6">
            Размещайте экскурсии и{' '}
            <span className="text-gradient-gold">мероприятия</span> на Daibilet
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Агрегатор экскурсий, мероприятий и музеев с единой системой продаж, отчётности и взаиморасчётов.
            Прозрачная агентская модель.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg gradient-gold text-slate-900 font-semibold text-lg shadow-gold hover:opacity-90 transition-opacity"
            >
              Начать сотрудничество
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#formats"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg border border-white/20 text-white font-semibold text-lg hover:bg-white/5 transition-colors"
            >
              Узнать подробнее
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Ticket, label: 'Экскурсии', desc: 'API и виджеты' },
              { icon: Users, label: 'Мероприятия', desc: 'Личный кабинет' },
              { icon: Building2, label: 'Музеи', desc: 'Open-date билеты' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-slate-900" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white text-sm">{item.label}</div>
                  <div className="text-xs text-white/50">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
