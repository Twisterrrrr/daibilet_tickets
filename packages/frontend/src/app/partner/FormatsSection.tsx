import { Plug, Layout, MapPin, Check } from 'lucide-react';

const formats = [
  {
    icon: Plug,
    title: 'Operator',
    subtitle: 'API / виджет провайдера',
    target: 'Для компаний со своей билетной системой (TicketsCloud, teplohod.info и др.)',
    commission: [
      { label: 'Экскурсии', value: '15–25%' },
      { label: 'Мероприятия', value: '10–20%' },
      { label: 'Музеи', value: '10–14%' },
    ],
    benefits: ['Минимальные технические доработки', 'Мы не вмешиваемся в вашу логику продаж', 'Быстрое подключение'],
    accent: false,
  },
  {
    icon: Layout,
    title: 'Supplier',
    subtitle: 'Личный кабинет на Daibilet',
    target: 'Для гидов, локальных операторов, музеев, организаторов мероприятий',
    commission: [
      { label: 'Экскурсии', value: '20–30%' },
      { label: 'Мероприятия', value: '15–25%' },
      { label: 'Площадки', value: '12–18%' },
    ],
    benefits: ['Полный контроль над расписанием', 'Автоматическая отчётность и акты', 'Не нужна своя билетная система'],
    accent: true,
  },
  {
    icon: MapPin,
    title: 'Venue',
    subtitle: 'Площадка / open-date',
    target: 'Для музеев, выставочных пространств, культурных центров',
    commission: [{ label: 'Базовая', value: '10–18%' }],
    benefits: ['Гибкая модель без расписания', 'QR-валидация на входе', 'Индивидуальные условия для госмузеев'],
    accent: false,
  },
];

export function FormatsSection() {
  return (
    <section id="formats" className="py-24 bg-slate-50">
      <div className="container-page">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            Форматы сотрудничества
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Выберите модель, которая подходит вашему бизнесу
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {formats.map((f) => (
            <div
              key={f.title}
              className={`relative rounded-2xl p-8 border transition-shadow hover:shadow-xl ${
                f.accent
                  ? 'bg-primary-600 text-white border-primary-600 shadow-lg'
                  : 'bg-white text-slate-900 border-slate-200 shadow-sm'
              }`}
            >
              {f.accent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-gold text-slate-900 text-xs font-semibold">
                  Популярный
                </div>
              )}

              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                  f.accent ? 'bg-white/10' : 'gradient-gold'
                }`}
              >
                <f.icon className={`w-6 h-6 ${f.accent ? 'text-white' : 'text-slate-900'}`} />
              </div>

              <h3 className="text-2xl font-bold mb-1">{f.title}</h3>
              <p className={`text-sm mb-4 ${f.accent ? 'text-white/70' : 'text-slate-600'}`}>{f.subtitle}</p>

              <p className={`text-sm mb-6 ${f.accent ? 'text-white/60' : 'text-slate-600'}`}>{f.target}</p>

              <div className="mb-6">
                <h4
                  className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                    f.accent ? 'text-white/50' : 'text-slate-500'
                  }`}
                >
                  Комиссия
                </h4>
                <div className="space-y-2">
                  {f.commission.map((c) => (
                    <div key={c.label} className="flex items-center justify-between">
                      <span className={`text-sm ${f.accent ? 'text-white/70' : 'text-slate-600'}`}>{c.label}</span>
                      <span className="font-bold text-lg">{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                {f.benefits.map((b) => (
                  <div key={b} className="flex items-start gap-2.5">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${f.accent ? 'text-amber-400' : 'text-emerald-500'}`} />
                    <span className={`text-sm ${f.accent ? 'text-white/80' : 'text-slate-700'}`}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
