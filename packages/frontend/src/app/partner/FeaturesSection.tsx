import { Search, ListChecks, ShoppingCart, TrendingUp, Tag, Globe } from 'lucide-react';

const features = [
  { icon: Globe, text: 'SEO-страницы по городам и тематикам' },
  { icon: Search, text: 'Продвижение в подборках каталога' },
  { icon: ShoppingCart, text: 'Upsell и cross-sell' },
  { icon: ListChecks, text: 'Планировщик поездки' },
  { icon: Tag, text: 'Гибкая система тарифов' },
  { icon: TrendingUp, text: 'Автоматическая перелинковка' },
];

export function FeaturesSection() {
  return (
    <section className="py-24 gradient-hero">
      <div className="container-page">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Дополнительные возможности</h2>
          <p className="text-white/60 max-w-xl mx-auto">Всё для максимальных продаж — без дополнительных затрат</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {features.map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <f.icon className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-sm text-white/80">{f.text}</span>
            </div>
          ))}
        </div>

        <div className="mt-16 max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { value: '2–5%', label: 'Конверсия в покупку' },
            { value: '3 000–10 000', label: 'Показов в месяц' },
            { value: '60–300', label: 'Продаж с SEO' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-amber-400 mb-1">{s.value}</div>
              <div className="text-sm text-white/50">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
