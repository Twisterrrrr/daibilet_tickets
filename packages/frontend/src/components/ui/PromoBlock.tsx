'use client';

import {
  Baby,
  Building2,
  CalendarDays,
  Heart,
  PartyPopper,
  Ship,
  Snowflake,
  Sparkles,
  Ticket,
  Umbrella,
  UtensilsCrossed,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api, type PromoBlockDto } from '@/lib/api';
import {
  loadPromoBlocksSafe,
  PROMO_BLOCKS_FALLBACK,
  PROMO_DEFAULT_GRADIENT,
  resolvePromoBlocks,
} from '@/lib/promo-blocks-fallback';

import { PromoSvgIcon } from './PromoSvgIcon';

const PROMO_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ship: Ship,
  sparkles: Sparkles,
  'party-popper': PartyPopper,
  snowflake: Snowflake,
  heart: Heart,
  'utensils-crossed': UtensilsCrossed,
  umbrella: Umbrella,
  baby: Baby,
  'calendar-days': CalendarDays,
  'building-2': Building2,
  ticket: Ticket,
};

interface PromoBlockProps {
  /** Блоки с сервера (SSR на главной). Если не переданы — клиентский fetch (страница /events) */
  initialBlocks?: PromoBlockDto[] | null;
  /** Текущий город для фильтрации (targetCitySlugs). Используется при клиентском fetch */
  citySlug?: string;
}

export function PromoBlock({ initialBlocks, citySlug }: PromoBlockProps) {
  const [blocks, setBlocks] = useState<PromoBlockDto[] | null>(initialBlocks ?? null);

  useEffect(() => {
    if (initialBlocks !== undefined) return;
    let cancelled = false;
    loadPromoBlocksSafe(() => api.getPromoBlocks(citySlug))
      .then((result) => {
        if (!cancelled) setBlocks(resolvePromoBlocks(result));
      })
      .catch(() => {
        if (!cancelled) setBlocks(PROMO_BLOCKS_FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, [initialBlocks, citySlug]);

  if (blocks === null) return null;
  if (blocks.length === 0) return null;

  return (
    <div className="grid gap-3 grid-cols-1 min-[361px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
      {blocks.map((promo) => {
        const bgStyle =
          promo.bgMode === 'SOLID' && promo.bgColor
            ? { backgroundColor: promo.bgColor }
            : promo.bgMode === 'GRADIENT' && promo.gradientFrom && promo.gradientTo
              ? { backgroundImage: `linear-gradient(135deg, ${promo.gradientFrom}, ${promo.gradientTo})` }
              : { backgroundImage: PROMO_DEFAULT_GRADIENT };

        const IconComponent = promo.iconSource === 'LIBRARY' && promo.iconKey ? PROMO_ICON_MAP[promo.iconKey] : null;

        return (
          <Link
            key={promo.slug}
            href={promo.href}
            className="group relative overflow-hidden rounded-xl p-5 text-white shadow-lg transition-transform hover:scale-[1.02] sm:p-6"
            style={bgStyle}
          >
            {IconComponent ? (
              <IconComponent className="mb-3 h-8 w-8 opacity-80" />
            ) : promo.iconSource === 'SVG' && promo.iconSvg ? (
              <PromoSvgIcon svg={promo.iconSvg} className="mb-3 h-8 w-8 opacity-80 [&_svg]:h-8 [&_svg]:w-8" />
            ) : null}
            <h3 className="text-lg font-bold">{promo.title}</h3>
            <p className="mt-1 text-sm text-white/80">{promo.description}</p>
            <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 transition-transform group-hover:scale-150" />
          </Link>
        );
      })}
    </div>
  );
}
