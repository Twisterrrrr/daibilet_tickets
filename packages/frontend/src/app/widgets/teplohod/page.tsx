import TeplohodWidgetClient, { type WidgetData } from './TeplohodWidgetClient';

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

  const url = `/api/v1/widgets/teplohod/event?${params.toString()}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { error: `Ошибка загрузки (${res.status})`, data: null };
    const json = (await res.json()) as T;
    return { error: null, data: json };
  } catch {
    return { error: 'Сервис временно недоступен', data: null };
  }
}

export default async function TeplohodPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, data } = await fetchEventData<WidgetData>(searchParams);

  return (
    <TeplohodWidgetClient
      initialError={error}
      initialData={data}
      eventId={searchParams.eventId}
    />
  );
}

