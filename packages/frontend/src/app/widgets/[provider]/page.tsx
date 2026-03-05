export const dynamic = 'force-dynamic';

import { SessionPickerClient } from './SessionPickerClient';

type SearchParams = {
  eventId?: string;
  lang?: 'ru' | 'en';
};

type WidgetSession = {
  id: string;
  startsAt: string;
  price?: number | null;
  available: number;
  isActive: boolean;
  isSoldOut: boolean;
  scarcityLevel: 'NONE' | 'LOW' | 'LAST';
  tags: Array<'SOONEST' | 'BEST_PRICE' | 'POPULAR'>;
};

/** Event from API (backend returns eventSlug; we map to slug for UI). */
type WidgetEventFromApi = {
  id: string;
  slug?: string;
  eventSlug?: string;
  title: string;
  imageUrl?: string | null;
  priceFrom?: number | null;
  currency: 'RUB';
};

type WidgetEvent = {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string | null;
  priceFrom?: number | null;
  currency: 'RUB';
};

type WidgetResponse = {
  event: WidgetEventFromApi;
  sessions: WidgetSession[];
};

type FetchResult<T> = {
  error: string | null;
  data: T | null;
};

async function fetchWidgetData<T = unknown>(provider: string, searchParams: SearchParams): Promise<FetchResult<T>> {
  const eventId = searchParams.eventId;
  if (!eventId) return { error: 'eventId is required', data: null };

  const params = new URLSearchParams();
  params.set('eventId', eventId);
  if (searchParams.lang) params.set('lang', searchParams.lang);

  const url = `/api/v1/widgets/${encodeURIComponent(provider)}/event?${params.toString()}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { error: `Ошибка загрузки (${res.status})`, data: null };
    const json = (await res.json()) as T;
    return { error: null, data: json };
  } catch {
    return { error: 'Сервис временно недоступен', data: null };
  }
}

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: { provider: string };
  searchParams: SearchParams;
}) {
  const { error, data } = await fetchWidgetData<WidgetResponse>(params.provider, searchParams);

  const event: WidgetEvent | null =
    data?.event != null
      ? {
          id: data.event.id,
          slug: data.event.eventSlug ?? data.event.slug ?? '',
          title: data.event.title,
          imageUrl: data.event.imageUrl,
          priceFrom: data.event.priceFrom,
          currency: data.event.currency,
        }
      : null;

  return (
    <div className="flex min-h-[120px] items-center justify-center bg-transparent px-2 py-3 text-sm">
      <SessionPickerClient
        provider={params.provider}
        eventId={data?.event?.id ?? null}
        initialError={error}
        event={event}
        sessions={data?.sessions ?? null}
      />
    </div>
  );
}

