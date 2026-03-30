import { notFound, permanentRedirect } from 'next/navigation';

import { getRiverCruiseCanonicalTarget } from '../river-cruises-routing';

export const revalidate = 21600;

type Props = { params: Promise<{ citySlug: string }> };

/**
 * Сервисный алиас: отдельной SEO-страницы нет — только постоянный редирект на канонический /cities/.../...
 */
export default async function RiverCruisesCityAliasPage({ params }: Props) {
  const { citySlug } = await params;
  const target = getRiverCruiseCanonicalTarget(citySlug);
  if (!target) notFound();

  permanentRedirect(target.canonicalPath);
}
