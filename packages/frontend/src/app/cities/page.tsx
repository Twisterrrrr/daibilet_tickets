import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { CityCard } from '@/components/ui/CityCard';

export const metadata: Metadata = {
  title: 'Города России — экскурсии, музеи и мероприятия',
  description:
    'Выберите город для посещения. Билеты на экскурсии, музеи и мероприятия в Москве, Петербурге, Казани, Владимире, Ярославле и других городах.',
};

export default async function CitiesPage() {
  let cities: any[] = [];
  try {
    cities = await api.getCities();
  } catch {
    // API недоступен — покажем пустое состояние
  }

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Города</h1>
        <p className="mt-2 text-lg text-slate-500">
          Выберите город — найдём лучшие экскурсии, музеи и мероприятия
        </p>
      </div>

      {/* Cities grid */}
      {cities.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city: any) => (
            <CityCard
              key={city.id}
              slug={city.slug}
              name={city.name}
              heroImage={city.heroImage}
              eventCount={city._count?.events ?? 0}
              venueCount={city.museumCount ?? city._count?.venues ?? 0}
              description={city.description}
              region={city.region ?? null}
              large
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center">
          <p className="text-lg text-slate-400">Города загружаются...</p>
          <p className="mt-1 text-sm text-slate-400">
            Убедитесь, что API запущен на порту 4000
          </p>
        </div>
      )}
    </div>
  );
}
