import { Baby, Heart, PartyPopper, Ship, Snowflake, Sparkles, Umbrella, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';

interface PromoItem {
  slug: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  months: number[]; // months when this promo is active (1-12)
}

const PROMOS: PromoItem[] = [
  // --- Сезонные (навигация / праздники) ---
  {
    slug: 'bridges',
    title: 'Развод мостов',
    description: 'Ночные экскурсии с видом на разводные мосты',
    href: '/events?tag=bridges',
    icon: Ship,
    gradient: 'from-indigo-600 to-blue-500',
    months: [4, 5, 6, 7, 8, 9, 10, 11], // April-November
  },
  {
    slug: 'white-nights',
    title: 'Белые ночи',
    description: 'Особые маршруты в период белых ночей',
    href: '/events?tag=white-nights',
    icon: Sparkles,
    gradient: 'from-violet-600 to-purple-500',
    months: [5, 6, 7], // May-July
  },
  {
    slug: 'scarlet-sails',
    title: 'Алые паруса',
    description: 'Праздничная программа «Алые паруса»',
    href: '/events?tag=scarlet-sails',
    icon: PartyPopper,
    gradient: 'from-red-500 to-orange-500',
    months: [6], // June only
  },
  {
    slug: 'new-year',
    title: 'Новогодняя программа',
    description: 'Праздничные события и экскурсии',
    href: '/events?tag=new-year',
    icon: Snowflake,
    gradient: 'from-cyan-500 to-blue-500',
    months: [12, 1], // December-January
  },

  // --- Всесезонные / зимние (через Collection-подборки) ---
  {
    slug: 'valentines',
    title: 'День влюблённых',
    description: 'Романтические экскурсии и ужины для двоих',
    href: '/podborki/den-vlyublennyh',
    icon: Heart,
    gradient: 'from-rose-500 to-pink-500',
    months: [2], // February
  },
  {
    slug: 'maslenitsa',
    title: 'Масленица',
    description: 'Гастро-экскурсии, блины и народные гуляния',
    href: '/podborki/maslenitsa',
    icon: UtensilsCrossed,
    gradient: 'from-amber-500 to-orange-500',
    months: [2, 3], // February-March
  },
  {
    slug: 'winter-city',
    title: 'Зимний город',
    description: 'Крытые экскурсии, музеи и тёплые маршруты',
    href: '/podborki/zimniy-gorod',
    icon: Umbrella,
    gradient: 'from-slate-600 to-blue-700',
    months: [11, 12, 1, 2, 3], // November-March
  },
  {
    slug: 'kids-holidays',
    title: 'Каникулы с детьми',
    description: 'Интерактивные программы и семейные экскурсии',
    href: '/podborki/kanikuly-s-detmi',
    icon: Baby,
    gradient: 'from-emerald-500 to-teal-500',
    months: [1, 3, 6, 7, 8], // Jan (winter break), Mar (spring break), Jun-Aug (summer)
  },
];

export function PromoBlock() {
  const currentMonth = new Date().getMonth() + 1;
  const activePromos = PROMOS.filter((p) => p.months.includes(currentMonth));

  if (activePromos.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {activePromos.map((promo) => {
        const Icon = promo.icon;
        return (
          <Link
            key={promo.slug}
            href={promo.href}
            className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${promo.gradient} p-5 text-white shadow-lg transition-transform hover:scale-[1.02] sm:p-6`}
          >
            <Icon className="mb-3 h-8 w-8 opacity-80" />
            <h3 className="text-lg font-bold">{promo.title}</h3>
            <p className="mt-1 text-sm text-white/80">{promo.description}</p>
            <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 transition-transform group-hover:scale-150" />
          </Link>
        );
      })}
    </div>
  );
}
