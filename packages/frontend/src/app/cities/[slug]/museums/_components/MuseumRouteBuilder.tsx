import Link from 'next/link';

interface MuseumRouteBuilderProps {
  citySlug: string;
  anchors: string[];
}

const ROUTE_SPB = [
  { slug: 'ermitazh', label: 'Государственный Эрмитаж' },
  { slug: 'isaakievskiy-sobor', label: 'Исаакиевский собор' },
  { slug: 'muzey-faberzhe', label: 'Музей Фаберже' },
];

export function MuseumRouteBuilder({ citySlug }: MuseumRouteBuilderProps) {
  if (citySlug !== 'saint-petersburg') return null;

  const route = ROUTE_SPB;

  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Соберите маршрут на 1 день</h2>
      <p className="mt-2 text-slate-600">
        Быстрый сценарий «Центр Петербурга»: 3 точки, без перегруза, удобно для первого визита.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {route.map((x) => (
          <Link
            key={x.slug}
            href={`/venues/${x.slug}`}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition-colors"
          >
            <div className="font-medium text-slate-900">{x.label}</div>
            <div className="mt-1 text-sm text-slate-600">Билет с открытой датой</div>
          </Link>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href="/events?city=saint-petersburg&category=EXCURSION"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          Посмотреть экскурсии
        </Link>
        <div className="text-sm text-slate-600">Дальше можно добавить экскурсии или купить всё одним заказом.</div>
      </div>
    </section>
  );
}
