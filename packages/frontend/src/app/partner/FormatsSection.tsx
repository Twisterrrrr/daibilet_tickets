import { Plug, Layout, MapPin, Check } from 'lucide-react';

const formats = [
  {
    icon: Plug,
    title: 'Оператор',
    subtitle: 'Внешний API / виджет провайдера',
    target: 'Для компаний со своей билетной системой или сторонней — TicketsCloud, teplohod.info и др.',
    benefits: ['Минимальные технические доработки', 'Мы не вмешиваемся в вашу логику продаж', 'Быстрое подключение'],
    accent: false,
  },
  {
    icon: Layout,
    title: 'Поставщик',
    subtitle: 'Личный кабинет на Дайбилет',
    target: 'Для частных гидов, небольших операторов, организаторов мероприятий',
    benefits: ['Полный контроль над расписанием', 'Автоматическая отчётность и акты', 'Не нужна своя билетная система'],
    accent: true,
  },
  {
    icon: MapPin,
    title: 'Площадка',
    subtitle: 'Билеты с открытой датой',
    target: 'Для музеев, выставочных пространств, культурных центров',
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
