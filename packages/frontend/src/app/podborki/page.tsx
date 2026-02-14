import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Подборки — тематические коллекции событий | Дайбилет',
  description:
    'Тематические подборки экскурсий, музеев и мероприятий: ночные прогулки, детские программы, романтические вечера и многое другое.',
};

export default async function CollectionsListPage() {
  let collections: any[] = [];
  try {
    collections = await api.getCollections();
  } catch {
    // fallback — пустой массив
  }

  // Группировка: кросс-городские (cityId=null) + по городам
  const crossCity = collections.filter((c) => !c.city);
  const byCity = new Map<string, { cityName: string; citySlug: string; items: any[] }>();

  for (const c of collections) {
    if (!c.city) continue;
    const existing = byCity.get(c.city.slug);
    if (existing) {
      existing.items.push(c);
    } else {
      byCity.set(c.city.slug, { cityName: c.city.name, citySlug: c.city.slug, items: [c] });
    }
  }

  const cityGroups = Array.from(byCity.values()).sort((a, b) =>
    b.items.length - a.items.length,
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-primary-600 transition-colors">Главная</Link>
        <span>/</span>
        <span className="text-slate-900">Подборки</span>
      </nav>

      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
        Подборки событий
      </h1>
      <p className="mt-2 max-w-2xl text-lg text-slate-500">
        Тематические коллекции: лучшие экскурсии, музеи и мероприятия, собранные нашими редакторами
      </p>

      {collections.length === 0 && (
        <div className="mt-12 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
          <p className="text-lg text-slate-500">Подборки скоро появятся</p>
          <p className="mt-1 text-sm text-slate-400">Мы готовим для вас тематические коллекции событий</p>
        </div>
      )}

      {/* Кросс-городские подборки */}
      {crossCity.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-slate-900">По всей России</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {crossCity.map((c) => (
              <CollectionCard key={c.slug} collection={c} />
            ))}
          </div>
        </section>
      )}

      {/* Подборки по городам */}
      {cityGroups.map(({ cityName, citySlug, items }) => (
        <section key={citySlug} className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">{cityName}</h2>
            <Link
              href={`/cities/${citySlug}`}
              className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Все события
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c: any) => (
              <CollectionCard key={c.slug} collection={c} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function CollectionCard({ collection }: { collection: any }) {
  return (
    <Link
      href={`/podborki/${collection.slug}`}
      className="group relative flex h-52 flex-col justify-end overflow-hidden rounded-xl bg-slate-900 p-5 transition-transform hover:scale-[1.02]"
    >
      {collection.heroImage && (
        <Image
          src={collection.heroImage}
          alt={collection.title}
          fill
          className="object-cover opacity-50 transition-opacity group-hover:opacity-60"
        />
      )}
      {!collection.heroImage && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-primary-900" />
      )}
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-white">{collection.title}</h3>
        {collection.subtitle && (
          <p className="mt-1 text-sm text-white/70">{collection.subtitle}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-sm text-white/60">
          {collection.city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {collection.city.name}
            </span>
          )}
          {collection.eventCount > 0 && (
            <span>{collection.eventCount} событий</span>
          )}
        </div>
      </div>
    </Link>
  );
}
