import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Финальные решения: публичного namespace `/landings/*` быть не должно (SEO).
  // HUB-страницы живут в корне (`/river-cruises`, `/bus-tours`, `/salute-9-may`).
  // Оставляем route только как hard 404, чтобы не ломать возможные внешние ссылки.
  await params;
  return { title: 'Страница не найдена', robots: { index: false, follow: false } };
}

export default async function HubLandingPage({ params }: Props) {
  await params;
  notFound();
}

