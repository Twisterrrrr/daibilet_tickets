import Link from 'next/link';
import { MapPin } from 'lucide-react';

interface CityCardProps {
  slug: string;
  name: string;
  heroImage: string | null;
  eventCount: number;
  description?: string | null;
  large?: boolean;
}

export function CityCard({ slug, name, heroImage, eventCount, description, large = false }: CityCardProps) {
  return (
    <Link
      href={`/cities/${slug}`}
      className={`card group relative overflow-hidden ${large ? 'h-64' : 'h-48'}`}
    >
      {heroImage ? (
        <img
          src={heroImage}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-primary-900" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className={`font-bold text-white ${large ? 'text-2xl' : 'text-xl'}`}>
          {name}
        </h3>
        {description && large && (
          <p className="mt-1 line-clamp-2 text-sm text-white/70">{description}</p>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-sm text-white/80">
          <MapPin className="h-4 w-4" />
          {eventCount > 0 ? `${eventCount} событий` : 'Скоро появятся события'}
        </div>
      </div>
    </Link>
  );
}
