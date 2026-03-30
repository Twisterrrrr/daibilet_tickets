import { notFound, permanentRedirect } from 'next/navigation';

import { getBusTourCanonicalTarget } from '../bus-tours-routing';

export const revalidate = 21600;

type Props = { params: Promise<{ citySlug: string }> };

/**
 * Сервисный алиас: SEO только на /cities/.../avtobusnye-ekskursii; здесь — постоянный редирект на канон.
 */
export default async function BusToursCityAliasPage({ params }: Props) {
  const { citySlug } = await params;
  const target = getBusTourCanonicalTarget(citySlug);
  if (!target) notFound();

  permanentRedirect(target.canonicalPath);
}
