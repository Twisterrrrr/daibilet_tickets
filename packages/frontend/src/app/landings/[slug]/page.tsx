import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { api } from '@/lib/api';

export const revalidate = 21600;

type HubLandingPayload = {
  landing: {
    id: string;
    slug: string;
    title: string;
    subtitle?: string | null;
    heroText?: string | null;
    landingType: 'HUB' | 'MULTI_CITY';
    metaTitle?: string | null;
    metaDescription?: string | null;
    canonicalUrl?: string | null;
    isIndexable: boolean;
  };
  variants: Array<{
    id: string;
    slug: string;
    title: string;
    canonicalPath: string;
    city: { id: string; slug: string; name: string };
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    isIndexable: boolean;
    isActive: boolean;
  }>;
  total: number;
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = (await api.getCatalogHubLandingBySlug(slug)) as HubLandingPayload;
    const title = (data.landing.metaTitle ?? data.landing.title) || data.landing.slug;
    const description = data.landing.metaDescription ?? data.landing.subtitle ?? undefined;
    const canonical = data.landing.canonicalUrl ?? `/landings/${encodeURIComponent(slug)}`;
    return {
      title,
      description,
      alternates: { canonical },
      robots: data.landing.isIndexable ? undefined : { index: false, follow: false },
    };
  } catch {
    return { title: 'Страница не найдена' };
  }
}

export default async function HubLandingPage({ params }: Props) {
  const { slug } = await params;
  let data: HubLandingPayload | null = null;
  try {
    data = (await api.getCatalogHubLandingBySlug(slug)) as HubLandingPayload;
  } catch {
    notFound();
  }
  if (!data) notFound();

  const variants = (data.variants ?? []).slice().sort((a, b) => a.city.name.localeCompare(b.city.name, 'ru'));

  return (
    <div className="container-page py-8 sm:py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
          {data.landing.title}
        </h1>
        {data.landing.subtitle ? (
          <p className="mt-2 text-sm text-slate-600 sm:text-base">{data.landing.subtitle}</p>
        ) : null}
        {data.landing.heroText ? (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-700">{data.landing.heroText}</p>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">Выберите город</h2>
        <p className="mt-1 text-sm text-slate-500">
          Канонические страницы — <span className="font-mono text-xs">/cities/…/…</span>. Этот хаб живёт в безопасном namespace{' '}
          <span className="font-mono text-xs">/landings/…</span>.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {variants.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
              Пока нет городских вариантов для этого хаба.
            </div>
          ) : (
            variants.map((v) => (
              <Link
                key={v.id}
                href={v.canonicalPath}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <div className="text-base font-bold text-slate-900">{v.city.name}</div>
                <div className="mt-1 text-sm text-slate-500">{v.title || 'Открыть'}</div>
                {!v.isIndexable ? (
                  <div className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">noindex</div>
                ) : null}
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

