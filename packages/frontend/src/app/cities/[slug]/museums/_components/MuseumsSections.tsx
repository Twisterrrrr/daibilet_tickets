import Link from 'next/link';

interface MuseumsSectionsProps {
  citySlug: string;
  content: {
    cityTitle: string;
    anchors: string[];
    mainMuseums?: Array<{ slug: string; label: string }>;
    modernMuseums?: Array<{ slug: string; label: string }>;
    kidsMuseums?: Array<{ slug: string; label: string }>;
  };
}

export function MuseumsSections({ citySlug, content }: MuseumsSectionsProps) {
  if (citySlug !== 'saint-petersburg') return null;

  const main =
    content.mainMuseums ??
    [
      { slug: 'ermitazh', label: 'Государственный Эрмитаж' },
      { slug: 'isaakievskiy-sobor', label: 'Исаакиевский собор' },
      { slug: 'petropavlovskaya-krepost', label: 'Петропавловская крепость' },
      { slug: 'russkiy-muzey-mikhaylovskiy-dvorets', label: 'Русский музей' },
      { slug: 'kunstkamera', label: 'Кунсткамера' },
    ];

  const modern =
    content.modernMuseums ??
    [
      { slug: 'muzey-faberzhe', label: 'Музей Фаберже' },
      { slug: 'erarta', label: 'Эрарта' },
      { slug: 'planetariy-1', label: 'Планетарий №1' },
      { slug: 'muzey-strit-arta', label: 'Музей стрит-арта' },
    ];

  const kids =
    content.kidsMuseums ??
    [
      { slug: 'grand-maket-rossiya', label: 'Гранд Макет Россия' },
      { slug: 'muzey-zheleznykh-dorog-rossii', label: 'Музей железных дорог' },
      { slug: 'planetariy-1', label: 'Планетарий №1' },
      { slug: 'titika', label: 'Музей рекордов Титикака' },
    ];

  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-medium text-slate-900">🏛 Главные музеи</div>
        <div className="mt-2 text-sm text-slate-600">
          Для первого визита и обязательной программы.
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {main.map((x) => (
            <Link
              key={x.slug}
              href={`/venues/${x.slug}`}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-200 transition-colors"
            >
              {x.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-medium text-slate-900">🎨 Частные и современные</div>
        <div className="mt-2 text-sm text-slate-600">
          Гибкие форматы и апселлы.
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {modern.map((x) => (
            <Link
              key={x.slug}
              href={`/venues/${x.slug}`}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-200 transition-colors"
            >
              {x.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
        <div className="text-sm font-medium text-slate-900">👨‍👩‍👧 С детьми</div>
        <div className="mt-2 text-sm text-slate-600">
          Интерактивные и семейные музеи.
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {kids.map((x) => (
            <Link
              key={x.slug}
              href={`/venues/${x.slug}`}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-200 transition-colors"
            >
              {x.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
