import { TrendingUp, Shield, Zap, Settings, BarChart3, Rocket } from 'lucide-react';

const benefits = [
  {
    icon: TrendingUp,
    title: 'Низкий входной барьер',
    desc: 'Промо-ставка 10% на первые 3 месяца. Тестируйте спрос без нагрузки на маржу.',
    highlight: '10% комиссия на старте',
  },
  {
    icon: BarChart3,
    title: 'Рост продаж без затрат',
    desc: 'SEO-страницы, подборки, перелинковка, планировщик поездки и кросс-продажи — всё за наш счёт.',
  },
  {
    icon: Shield,
    title: 'Прозрачная финансовая модель',
    desc: 'Базовая ставка 25%. Для госмузеев условия обсуждаются индивидуально. Нет скрытых удержаний.',
  },
  {
    icon: Zap,
    title: 'Полная автоматизация',
    desc: 'Ваучеры, QR-коды, расчёт возвратов, отчёты в XLS/PDF — автоматически.',
  },
  {
    icon: Settings,
    title: 'Контроль и гибкость',
    desc: 'Управляйте расписанием, ценами, тарифами, квотами и политикой отмен самостоятельно.',
  },
  {
    icon: Rocket,
    title: 'Масштабируемость',
    desc: 'Интеграция с билетными системами, сплит-платежи, гибкая агентская модель. Растите вместе с нами.',
  },
];

export function BenefitsSection() {
  return (
    <section className="py-24 bg-white">
      <div className="container-page">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            Почему выгодно работать с Дайбилет
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Всё для увеличения продаж и снижения операционной нагрузки
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-lg transition-shadow group"
            >
              <div className="w-11 h-11 rounded-xl gradient-gold flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <b.icon className="w-5 h-5 text-slate-900" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{b.title}</h3>
              {b.highlight && (
                <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold mb-3">
                  {b.highlight}
                </span>
              )}
              <p className="text-sm text-slate-600 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
