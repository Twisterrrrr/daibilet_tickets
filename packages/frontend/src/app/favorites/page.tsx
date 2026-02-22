'use client';

import { Heart, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { EventCard } from '@/components/ui/EventCard';
import { useFavorites } from '@/hooks/useFavorites';
import { api } from '@/lib/api';

export default function FavoritesPage() {
  const { slugs, mounted } = useFavorites();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mounted || slugs.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .getEvents({ slugs: slugs.join(','), limit: 50 })
      .then((res) => {
        if (!cancelled) setEvents(res.items || []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, slugs.join(',')]);

  if (!mounted) {
    return (
      <div className="container-page py-16">
        <div className="animate-pulse rounded-xl bg-slate-100 h-64" />
      </div>
    );
  }

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100">
          <Heart className="h-6 w-6 fill-rose-500 text-rose-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Избранное</h1>
          <p className="mt-0.5 text-slate-500">
            {slugs.length === 0
              ? 'Добавляйте события, нажимая на сердечко'
              : `${slugs.length} ${slugs.length === 1 ? 'событие' : slugs.length < 5 ? 'события' : 'событий'}`}
          </p>
        </div>
      </div>

      {slugs.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-20">
          <Heart className="h-16 w-16 text-slate-300" />
          <p className="mt-4 text-lg font-medium text-slate-600">Пока пусто</p>
          <p className="mt-1 text-slate-500">Нажмите на сердечко на карточке события, чтобы добавить его сюда</p>
          <Link href="/events" className="btn-primary mt-6 inline-flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Смотреть каталог
          </Link>
        </div>
      ) : loading ? (
        <div className="mt-8 grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-slate-100 h-72" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 py-12 text-center">
          <p className="text-slate-600">События из избранного больше не доступны</p>
          <Link href="/events" className="btn-primary mt-4 inline-flex">
            Обновить каталог
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {events.map((event: any) => (
            <EventCard
              key={event.id}
              slug={event.slug}
              title={event.title}
              category={event.category}
              subcategories={event.subcategories}
              imageUrl={event.imageUrl}
              priceFrom={event.priceFrom}
              rating={event.rating}
              reviewCount={event.reviewCount}
              durationMinutes={event.durationMinutes}
              city={event.city}
              nextSessionAt={event.nextSessionAt}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
