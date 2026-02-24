import type { Metadata } from 'next';
import Link from 'next/link';

import { EventCard } from '@/components/ui/EventCard';
import { api } from '@/lib/api';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await api.getTagBySlug(slug);
    return {
      title: data.tag.metaTitle || `${data.tag.name} — события | Дайбилет`,
      description: data.tag.metaDescription || data.tag.description,
    };
  } catch {
    return { title: 'Тег не найден' };
  }
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;
  let data: any = null;
  try {
    data = await api.getTagBySlug(slug);
  } catch {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Тег не найден</h1>
        <Link href="/events" className="btn-primary mt-6 inline-flex">
          К каталогу
        </Link>
      </div>
    );
  }

  const { tag, events, total } = data;

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="mb-8">
        <nav className="mb-3 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/events" className="hover:text-primary-600">
            Каталог
          </Link>
          <span>/</span>
          <span className="text-slate-900">{tag.name}</span>
        </nav>
        <h1 className="text-3xl font-bold text-slate-900">{tag.name}</h1>
        {tag.description && <p className="mt-2 text-lg text-slate-500">{tag.description}</p>}
        <p className="mt-1 text-sm text-slate-400">{total} событий</p>
      </div>

      {/* Events */}
      {events.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 min-[361px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event: any) => (
            <EventCard
              key={event.id}
              slug={event.slug}
              title={event.title}
              category={event.category}
              imageUrl={event.imageUrl}
              priceFrom={event.priceFrom}
              rating={event.rating}
              reviewCount={event.reviewCount}
              durationMinutes={event.durationMinutes}
              city={event.city}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center">
          <p className="text-lg text-slate-400">События по тегу «{tag.name}» появятся скоро</p>
        </div>
      )}
    </div>
  );
}
