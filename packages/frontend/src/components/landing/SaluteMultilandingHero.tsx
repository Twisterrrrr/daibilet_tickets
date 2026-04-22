import Link from 'next/link';

import { ArrowDown, MapPin, Shield, Star, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

function StatChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
      {icon}
      {label}
    </div>
  );
}

function pluralCitiesRu(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} городов`;
  if (mod10 === 1) return `${n} город`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} города`;
  return `${n} городов`;
}

/**
 * Hero для корня `/salute-9-may`: тот же градиент и ритм, что у {@link SaluteLandingHero}, без привязки к одному городу.
 */
export function SaluteMultilandingHero({
  heroTitle,
  subtitle,
  cityCount,
}: {
  heroTitle: string;
  subtitle?: string | null;
  cityCount: number;
}) {
  const citiesLabel = cityCount > 0 ? pluralCitiesRu(cityCount) : 'Города России';

  return (
    <section className="gradient-salute-hero relative overflow-hidden">
      <div className="container-page py-14 md:py-20">
        <div className="max-w-4xl">
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-white/70">
            <Link href="/" className="transition-colors hover:text-white">
              Главная
            </Link>
            <span className="text-white/50">/</span>
            <span className="text-white">Салют 9 мая</span>
          </nav>

          <h1 className="mb-4 text-3xl font-extrabold leading-tight text-white md:text-5xl">{heroTitle}</h1>

          {subtitle ? (
            <p className="mb-6 max-w-3xl text-base leading-relaxed text-white/85 md:text-lg">{subtitle}</p>
          ) : null}

          <div className="mb-8 flex flex-wrap gap-3">
            <StatChip icon={<MapPin className="h-4 w-4" aria-hidden />} label={citiesLabel} />
            <StatChip icon={<TrendingUp className="h-4 w-4" aria-hidden />} label="Сравнение цен в каталоге" />
            <StatChip icon={<Shield className="h-4 w-4" aria-hidden />} label="Оплата у организатора" />
            <StatChip icon={<Star className="h-4 w-4" aria-hidden />} label="Рейтинги и отзывы" />
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="#cities"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-bold text-primary-700 shadow-lg transition-colors hover:bg-primary-50"
            >
              Выбрать город
              <ArrowDown className="h-4 w-4" />
            </a>
            <a
              href="#how-to-choose"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/5 px-6 py-3 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              Как подобрать формат
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
