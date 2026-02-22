import { VENUE_TYPE_LABELS, type VenueType } from '@daibilet/shared';
import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { VenueCard } from '@/components/ui/VenueCard';
import { api } from '@/lib/api';

import { VenueFilters } from './VenueFilters';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Музеи и Арт — билеты, часы работы, адреса | Дайбилет',
  description: 'Купить билеты в музеи, галереи, арт-пространства. Часы работы, цены, отзывы. Удобный поиск по городам.',
};

interface Props {
  searchParams: Promise<{
    city?: string;
    venueType?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function VenuesPage({ searchParams }: Props) {
  const { city, venueType, sort, page } = await searchParams;

  let venues: any;
  try {
    venues = await api.getVenues({
      ...(city && { city }),
      ...(venueType && { venueType }),
      ...(sort && { sort }),
      page: Number(page) || 1,
      limit: 24,
    });
  } catch {
    venues = { items: [], total: 0, page: 1, totalPages: 0 };
  }

  // Fetch cities for filter
  let cities: any[] = [];
  try {
    cities = await api.getCities(true);
  } catch {
    cities = [];
  }

  const currentPage = Number(page) || 1;
  const totalPages = venues.totalPages || 1;

  return (
    <>
      {/* Breadcrumbs */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <nav className="flex items-center text-sm text-gray-500 gap-1.5">
            <Link href="/" className="hover:text-gray-900">
              Главная
            </Link>
            <ChevronRight size={14} />
            <span className="text-gray-900">Музеи и Арт</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">Музеи и Арт</h1>
        <p className="text-gray-500 mb-6">
          {venues.total > 0
            ? `${venues.total} ${pluralize(venues.total, 'место', 'места', 'мест')}`
            : 'Места появятся в скором времени'}
        </p>

        {/* Filters */}
        <VenueFilters
          cities={cities}
          currentCity={city || ''}
          currentType={venueType || ''}
          currentSort={sort || 'rating'}
        />

        {/* Grid */}
        {venues.items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-6">
            {venues.items.map((v: any) => (
              <VenueCard key={v.id} {...v} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg mb-2">Места не найдены</p>
            <p className="text-sm">Попробуйте изменить фильтры или вернитесь позже</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const params = new URLSearchParams();
              if (city) params.set('city', city);
              if (venueType) params.set('venueType', venueType);
              if (sort) params.set('sort', sort);
              params.set('page', String(p));
              return (
                <Link
                  key={p}
                  href={`/venues?${params}`}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    p === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </Link>
              );
            })}
          </div>
        )}

        {/* SEO text */}
        <div className="mt-12 prose prose-gray max-w-3xl">
          <h2>Музеи и арт-пространства</h2>
          <p>
            На Дайбилет вы найдете билеты в лучшие музеи, галереи, дворцы и арт-пространства. Покупайте билеты с
            открытой датой, без очередей и наценок. Мы подобрали для вас самые интересные места с подробными описаниями,
            актуальными часами работы и отзывами посетителей.
          </p>
        </div>
      </div>
    </>
  );
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (lastDigit > 1 && lastDigit < 5) return few;
  if (lastDigit === 1) return one;
  return many;
}
