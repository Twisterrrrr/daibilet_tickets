import Link from 'next/link';

import { getBusTourCanonicalTarget } from '@/app/bus-tours/bus-tours-routing';
import { getRiverCruiseCanonicalTarget } from '@/app/river-cruises/river-cruises-routing';

type Variant = 'chips' | 'inline';

interface Props {
  citySlug?: string | null;
  variant?: Variant;
}

/**
 * Небольшой блок ссылок на кластеры-хабы:
 * - Речные прогулки
 * - Автобусные экскурсии
 * - Салют 9 мая
 *
 * Используется в каталоге, на страницах городов и лендингов.
 */
export function ClusterHubLinks({ citySlug, variant = 'chips' }: Props) {
  const riverRoute = citySlug ? getRiverCruiseCanonicalTarget(citySlug) : null;
  const busRoute = citySlug ? getBusTourCanonicalTarget(citySlug) : null;

  const riverHref = riverRoute?.canonicalPath ?? '/river-cruises';
  const busHref = busRoute?.canonicalPath ?? '/bus-tours';
  const saluteHref = citySlug ? `/cities/${citySlug}/salute-9-may` : '/salute-9-may';

  const city = citySlug ?? '';

  const riverLabel =
    variant === 'chips'
      ? city === 'moscow'
        ? 'Речные прогулки по Москве-реке'
        : city === 'saint-petersburg'
          ? 'Речные прогулки по Неве и каналам'
          : city === 'kazan'
            ? 'Речные прогулки в Казани'
            : city === 'nizhny-novgorod'
              ? 'Речные прогулки в Нижнем Новгороде'
              : city === 'kaliningrad'
                ? 'Прогулки по воде в Калининграде'
                : city === 'sochi'
                  ? 'Морские и речные прогулки в Сочи'
                  : 'Речные прогулки'
      : 'Речные прогулки';

  const busLabel =
    variant === 'chips'
      ? city === 'moscow'
        ? 'Автобусные экскурсии в Москве'
        : city === 'saint-petersburg'
          ? 'Автобусные экскурсии в Санкт-Петербурге'
          : 'Автобусные экскурсии'
      : 'Автобусные экскурсии';

  const saluteLabel =
    variant === 'chips'
      ? city === 'moscow'
        ? 'Салют 9 мая в Москве'
        : city === 'saint-petersburg'
          ? 'Салют 9 мая в Петербурге'
          : 'Салют 9 мая'
      : 'Салют 9 мая';

  const baseClass =
    'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 shadow-sm hover:border-primary-300 hover:bg-primary-50 transition-colors';

  const links = [
    { href: riverHref, label: riverLabel },
    { href: busHref, label: busLabel },
    { href: saluteHref, label: saluteLabel },
  ];

  if (variant === 'inline') {
    return (
      <p className="mt-2 text-xs text-slate-500 sm:text-sm">
        Или посмотрите{' '}
        {links.map((l, i) => (
          <span key={l.href}>
            {i > 0 && (i === links.length - 1 ? ' или ' : ', ')}
            <Link href={l.href} className="font-medium text-primary-700 hover:text-primary-900">
              {l.label.toLowerCase()}
            </Link>
          </span>
        ))}
        .
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={baseClass}>
          {l.label}
        </Link>
      ))}
    </div>
  );
}

