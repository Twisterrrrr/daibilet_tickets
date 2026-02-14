import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, Train } from 'lucide-react';
import { formatPrice, VENUE_TYPE_LABELS, type VenueType } from '@daibilet/shared';

interface VenueCardProps {
  slug: string;
  title: string;
  shortTitle?: string | null;
  venueType: string;
  imageUrl?: string | null;
  address?: string | null;
  metro?: string | null;
  priceFrom?: number | null;
  rating: number;
  reviewCount: number;
  city?: { name: string; slug: string } | null;
}

export function VenueCard({
  slug,
  title,
  venueType,
  imageUrl,
  address,
  metro,
  priceFrom,
  rating,
  reviewCount,
  city,
}: VenueCardProps) {
  const typeLabel = VENUE_TYPE_LABELS[venueType as VenueType] || venueType;

  return (
    <Link
      href={`/venues/${slug}`}
      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <MapPin size={48} />
          </div>
        )}
        {/* Type Badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700">
          {typeLabel}
        </span>
        {/* Price Badge */}
        {priceFrom && (
          <span className="absolute bottom-3 right-3 px-2.5 py-1 bg-emerald-500/90 text-white rounded-full text-xs font-semibold">
            от {formatPrice(priceFrom)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 text-[15px] leading-snug">
          {title}
        </h3>

        {/* Location */}
        <div className="mt-2 space-y-1">
          {address && (
            <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
              <MapPin size={12} className="flex-shrink-0" />
              {address}
            </p>
          )}
          {metro && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Train size={12} className="flex-shrink-0" />
              {metro}
            </p>
          )}
        </div>

        {/* Rating */}
        {rating > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold text-gray-900">{rating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({reviewCount})</span>
          </div>
        )}
      </div>
    </Link>
  );
}
