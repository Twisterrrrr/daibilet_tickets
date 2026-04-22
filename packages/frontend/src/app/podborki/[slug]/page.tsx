import { permanentRedirect } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; city?: string }>;
}

export default async function LegacyPodborkiSlugRedirect({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.page) q.set('page', sp.page);
  if (sp.city) q.set('city', sp.city);
  const qs = q.toString() ? `?${q}` : '';
  permanentRedirect(`/collections/${encodeURIComponent(slug)}${qs}`);
}
