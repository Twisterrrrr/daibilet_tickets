"use client";

import { useEffect, useState } from 'react';
import { ArrowRight, Landmark, MapPin } from 'lucide-react';
import Link from 'next/link';

interface CityCardRegion {
  slug: string;
  name: string;
  eventCount: number;
}

interface CityCardProps {
  slug: string;
  name: string;
  heroImage: string | null;
  eventCount: number;
  venueCount?: number;
  description?: string | null;
  large?: boolean;
  region?: CityCardRegion | null;
}

function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} событий`;
  if (mod10 === 1) return `${n} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} события`;
  return `${n} событий`;
}

function pluralVenues(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} музеев`;
  if (mod10 === 1) return `${n} музей`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} музея`;
  return `${n} музеев`;
}

export function CityCard({
  slug,
  name,
  heroImage,
  eventCount,
  venueCount,
  description,
  large = false,
  region,
}: CityCardProps) {
  const [hasImage, setHasImage] = useState(false);

  useEffect(() => {
    if (!heroImage) {
      setHasImage(false);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setHasImage(true);
    };
    img.onerror = () => {
      if (!cancelled) setHasImage(false);
    };
    img.src = heroImage;
    return () => {
      cancelled = true;
    };
  }, [heroImage]);

  return (
    <div className="flex flex-col">
      <Link href={`/cities/${slug}`} className={`card group relative overflow-hidden ${large ? 'h-64' : 'h-48'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-primary-900" />
        {hasImage && (
          <img
            src={heroImage || ''}
            alt={name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className={`font-bold text-white ${large ? 'text-2xl' : 'text-xl'}`}>{name}</h3>
          {description && large && <p className="mt-1 line-clamp-2 text-sm text-white/70">{description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {eventCount > 0 ? pluralEvents(eventCount) : 'Скоро появятся события'}
            </span>
            {venueCount != null && venueCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5" />
                {pluralVenues(venueCount)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {region && region.eventCount > 0 && (
        <Link
          href={`/regions/${region.slug}`}
          className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
        >
          <span className="font-medium text-slate-700 truncate">+ {region.name}</span>
          <span className="shrink-0 text-slate-400">{pluralEvents(region.eventCount)}</span>
          <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" />
        </Link>
      )}
    </div>
  );
}
