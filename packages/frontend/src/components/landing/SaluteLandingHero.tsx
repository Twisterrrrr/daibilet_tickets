import Link from 'next/link';
import type { ReactNode } from 'react';

import { ArrowDown, Shield, Star, TrendingUp } from 'lucide-react';

/** Чип в hero: «12 предложений» */
export function pluralOffersRu(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} предложений`;
  if (mod10 === 1) return `${n} предложение`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} предложения`;
  return `${n} предложений`;
}

/** Счётчик под фильтром: «N вариантов» */
export function pluralVariantsRu(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} вариантов`;
  if (mod10 === 1) return `${n} вариант`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} варианта`;
  return `${n} вариантов`;
}

/** Счётчик в строке под тулбаром Lovable: «N экскурсий» */
export function pluralExcursionsRu(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} экскурсий`;
  if (mod10 === 1) return `${n} экскурсия`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} экскурсии`;
  return `${n} экскурсий`;
}

function StatChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
      {icon}
      {label}
    </div>
  );
}

/**
 * Hero салютного лендинга: градиент как у Lovable, чипы доверия, две CTA.
 */
export function SaluteLandingHero({
  heroTitle,
  subtitle,
  cityName,
  tripCount,
  totalSold,
  avgRating,
}: {
  heroTitle: string;
  subtitle?: string | null;
  cityName: string;
  tripCount: number;
  totalSold?: number | null;
  avgRating: number;
}) {
  const soldLabel =
    typeof totalSold === 'number' && totalSold > 0
      ? `Более ${Number(totalSold).toLocaleString('ru-RU')} продано`
      : '8 340+ продано';

  return (
    <section className="gradient-salute-hero relative overflow-hidden">
      <div className="container-page py-16 md:py-24">
        <div className="max-w-4xl">
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-white/70">
            <span className="flex items-center gap-2">
              <Link href="/" className="transition-colors hover:text-white">
                Главная
              </Link>
            </span>
            <span className="flex items-center gap-2">
              <span>/</span>
              <Link href="/salute-9-may" className="transition-colors hover:text-white">
                Салют 9 мая
              </Link>
            </span>
            <span className="flex items-center gap-2">
              <span>/</span>
              <span className="text-white">{cityName}</span>
            </span>
          </nav>

          <h1 className="mb-4 text-3xl font-extrabold leading-tight text-white md:text-5xl">{heroTitle}</h1>

          {subtitle ? (
            <p className="mb-6 max-w-3xl text-base leading-relaxed text-white/85 md:text-lg">{subtitle}</p>
          ) : null}

          <div className="mb-8 flex flex-wrap gap-3">
            <StatChip
              icon={<TrendingUp className="h-4 w-4" aria-hidden />}
              label={pluralOffersRu(tripCount)}
            />
            <StatChip icon={<Shield className="h-4 w-4" aria-hidden />} label={soldLabel} />
            <StatChip
              icon={<Star className="h-4 w-4" aria-hidden />}
              label={`${avgRating} / 5`}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="#variants"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-bold text-primary-700 shadow-lg transition-colors hover:bg-primary-50"
            >
              Смотреть предложения
              <ArrowDown className="h-4 w-4" />
            </a>
            <a
              href="#how-to-choose"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/5 px-6 py-3 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              Как выбрать лучшее предложение
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
