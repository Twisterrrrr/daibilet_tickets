import { ArrowRight, Quote, Shield, Star } from 'lucide-react';
import Link from 'next/link';

/* ---- HowToChoose ---- */
interface HowToChooseItem {
  title: string;
  text: string;
}

export function HowToChoose({ items }: { items: HowToChooseItem[] }) {
  if (!items?.length) return null;
  return (
    <section id="how-to-choose" className="py-12">
      <h2 className="text-2xl font-bold text-slate-900">Как выбрать прогулку</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---- InfoBlocks ---- */
interface InfoBlock {
  title: string;
  text: string;
}

export function InfoBlocks({ items }: { items: InfoBlock[] }) {
  if (!items?.length) return null;
  return (
    <section className="py-12">
      {items.map((item, idx) => (
        <div key={idx} className="mb-6 last:mb-0">
          <h2 className="text-2xl font-bold text-slate-900">{item.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 whitespace-pre-line">{item.text}</p>
        </div>
      ))}
    </section>
  );
}

/* ---- ReviewsSection ---- */
interface Review {
  text: string;
  author: string;
  rating: number;
}

export function ReviewsSection({ items }: { items: Review[] }) {
  if (!items?.length) return null;
  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold text-slate-900">Отзывы</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((review, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5">
            <Quote className="mb-2 h-5 w-5 text-slate-300" />
            <p className="text-sm leading-relaxed text-slate-700">{review.text}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">{review.author}</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---- StatsBadge ---- */
interface Stats {
  soldTickets?: number;
  totalSold?: number;
  avgRating?: number;
}

export function StatsBadge({ stats }: { stats: Stats }) {
  if (!stats) return null;
  const sold = stats.soldTickets ?? stats.totalSold ?? 0;
  const rating = stats.avgRating ?? 0;
  if (sold === 0 && rating === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-primary-50 to-white py-5 text-center">
      {sold > 0 && (
        <div>
          <div className="text-2xl font-bold text-primary-700">{sold.toLocaleString('ru-RU')}+</div>
          <div className="text-xs text-slate-500">билетов продано за сезон</div>
        </div>
      )}
      {rating > 0 && (
        <div>
          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-primary-700">
            {rating.toFixed(1)}
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
          <div className="text-xs text-slate-500">средняя оценка</div>
        </div>
      )}
    </div>
  );
}

/* ---- RelatedLinks ---- */
interface RelatedLink {
  title: string;
  href: string;
}

export function RelatedLinks({ items }: { items: RelatedLink[] }) {
  if (!items?.length) return null;
  return (
    <section className="py-8">
      <h3 className="text-lg font-semibold text-slate-900">Смотрите также</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((link, idx) => (
          <Link
            key={idx}
            href={link.href}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 hover:border-primary-200"
          >
            {link.title}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---- LegalDisclaimer ---- */
export function LegalDisclaimer({ text }: { text?: string }) {
  const defaultText =
    'Продажа билетов осуществляется организатором мероприятия через билетную систему Ticketscloud. Дайбилет является информационным сервисом и не несёт ответственности за проведение мероприятий.';
  return (
    <div className="border-t border-slate-100 py-6">
      <div className="flex items-start gap-2 text-xs text-slate-400">
        <Shield className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <p>{text || defaultText}</p>
      </div>
    </div>
  );
}
