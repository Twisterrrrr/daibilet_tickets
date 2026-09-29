import TeplohodWidgetClient, { type WidgetData } from './TeplohodWidgetClient';
import { fetchApi } from '@/lib/api';

export const dynamic = 'force-dynamic';

type SearchParams = {
  eventId?: string;
  lang?: 'ru' | 'en';
  theme?: 'light' | 'dark';
  layout?: 'compact' | 'full';
};

type FetchResult<T> = {
  error: string | null;
  data: T | null;
};

async function fetchEventData<T = unknown>(searchParams: SearchParams): Promise<FetchResult<T>> {
  const eventId = searchParams.eventId;
  if (!eventId) return { error: 'eventId is required', data: null };

  const params = new URLSearchParams();
  params.set('eventId', eventId);
  if (searchParams.lang) params.set('lang', searchParams.lang);
  if (searchParams.theme) params.set('theme', searchParams.theme);
  if (searchParams.layout) params.set('layout', searchParams.layout);

  try {
    const json = await fetchApi<T>(`/widgets/teplohod/event?${params.toString()}`, { cache: 'no-store' });
    return { error: null, data: json };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Сервис временно недоступен';
    return { error: msg || 'Сервис временно недоступен', data: null };
  }
}

export default async function TeplohodPage({ searchParams }: { searchParams: SearchParams }) {
  // Next.js may pass `searchParams` as an async dynamic API in some runtimes.
  // Normalize to a plain object before reading properties.
  const sp = (await Promise.resolve(searchParams)) as SearchParams;
  const { error, data } = await fetchEventData<WidgetData>(sp);

  return (
    <TeplohodWidgetClient
      initialError={error}
      initialData={data}
      eventId={sp.eventId}
    />
  );
}

