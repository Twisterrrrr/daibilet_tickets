import { api } from '@/shared/api/client';
import type { DashboardAggregation, DashboardBlock, ImportedSalesDashboardDto } from '@/modules/dashboard/types';
import type { SupplierIntegrationDto, SyncStatusDto } from '@/modules/import-sources/types';

type Paginated<T> = { items: T[]; total: number };

function iso(date: Date) {
  return date.toISOString();
}

function providerStatus(items: SupplierIntegrationDto[], code: string) {
  const item = items.find((it) => it.adapterCode === code);
  return item?.status ?? 'not configured';
}

export async function getDashboardAggregation(): Promise<DashboardAggregation> {
  const warnings: string[] = [];
  const generatedAt = iso(new Date());

  const [dashRes, sourcesRes, syncRes, unknownsRes] = await Promise.allSettled([
    api<ImportedSalesDashboardDto>('/admin/imported-sales/dashboard'),
    api<Paginated<SupplierIntegrationDto>>('/admin/supplier-integrations?limit=20'),
    api<SyncStatusDto>('/admin/settings/sync-status'),
    api<unknown[]>('/admin/source-categories/unknowns'),
  ]);

  const dash = dashRes.status === 'fulfilled' ? dashRes.value : null;
  const sources = sourcesRes.status === 'fulfilled' ? sourcesRes.value.items : [];
  const sync = syncRes.status === 'fulfilled' ? syncRes.value : null;
  const unknowns = unknownsRes.status === 'fulfilled' ? unknownsRes.value.length : null;

  if (!dash) warnings.push('dashboard: /admin/imported-sales/dashboard недоступен');
  if (sourcesRes.status !== 'fulfilled') warnings.push('sources: /admin/supplier-integrations недоступен');
  if (!sync) warnings.push('sync: /admin/settings/sync-status недоступен');

  const catalogReadiness: DashboardBlock = {
    id: 'catalog-readiness',
    title: 'Готовность каталога',
    description: 'Импортированные события, публикация, внешняя покупка и причины, которые мешают оператору выпустить витрину.',
    signals: [
      { key: 'events_total', label: 'Все импортные', value: dash?.events.total ?? null, href: '/admin-v4/events?source=IMPORTED' },
      { key: 'events_published', label: 'Активные', value: dash?.events.published ?? null, href: '/admin-v4/events?source=IMPORTED&active=true' },
      {
        key: 'events_ready_to_publish',
        label: 'К публикации',
        value: dash?.events.readyToPublish ?? null,
        href: '/admin-v4/events?source=IMPORTED&readyToPublish=true&view=ready_publish',
        tone: dash?.events.readyToPublish == null ? 'warning' : 'default',
      },
      {
        key: 'events_missing_venue',
        label: 'Без площадки',
        value: dash?.events.missingVenue ?? null,
        href: '/admin-v4/events?source=IMPORTED&needsAttention=true&view=needs_attention',
        tone: dash?.events.missingVenue != null && dash.events.missingVenue > 0 ? 'warning' : 'default',
      },
      {
        key: 'events_missing_purchase_link',
        label: 'Покупка не готова',
        value: dash?.events.missingPurchaseLink ?? null,
        href: '/admin-v4/events?source=IMPORTED&purchaseReadiness=NOT_READY&view=purchase_blocked',
        tone: dash?.events.missingPurchaseLink != null && dash.events.missingPurchaseLink > 0 ? 'warning' : 'default',
      },
      {
        key: 'active_sessions',
        label: 'Активные сеансы',
        value: sync ? `${sync.sessions.active}/${sync.sessions.total}` : null,
        href: '/admin-v4/sync-health',
      },
    ],
  };

  const landingTraffic: DashboardBlock = {
    id: 'landing-traffic-engine',
    title: 'Лендинги и хабы',
    description: 'Контентные точки входа, которые должны приводить пользователя к импортируемым событиям.',
    signals: [
      { key: 'landings_total', label: 'Все лендинги', value: dash?.landings.total ?? null, href: '/admin-v4/landings' },
      { key: 'landings_published', label: 'Опубликовано', value: dash?.landings.published ?? null, href: '/admin-v4/landings?status=ACTIVE' },
      {
        key: 'landings_missing_seo',
        label: 'Без SEO',
        value: dash?.landings.missingSeo ?? null,
        href: '/admin-v4/landings?status=ACTIVE',
        tone: dash?.landings.missingSeo != null && dash.landings.missingSeo > 0 ? 'warning' : 'default',
      },
      {
        key: 'landings_without_matched_events',
        label: 'Без выдачи событий',
        value: dash?.landings.withoutMatchedEvents ?? null,
        href: '/admin-v4/landings',
        tone: dash?.landings.withoutMatchedEvents != null && dash.landings.withoutMatchedEvents > 0 ? 'warning' : 'default',
      },
      { key: 'landings_city_count', label: 'Городские', value: dash?.landings.city ?? null, href: '/admin-v4/landings?landingType=CITY' },
      { key: 'landings_multi_city_count', label: 'Мульти-город', value: dash?.landings.multiCity ?? null, href: '/admin-v4/landings?landingType=MULTI_CITY' },
    ],
  };

  const importHealth: DashboardBlock = {
    id: 'import-health',
    title: 'Источники импорта',
    description: 'Рабочее состояние Ticketscloud и Teplohod.info без внутреннего финансового контура.',
    signals: [
      { key: 'tc_status', label: 'Ticketscloud', value: providerStatus(sources, 'TICKETSCLOUD'), href: '/admin-v4/sources' },
      { key: 'tep_status', label: 'Teplohod.info', value: providerStatus(sources, 'TEPLOHOD'), href: '/admin-v4/sources' },
      {
        key: 'latest_sync_time',
        label: 'Последний sync',
        value: sync?.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleString('ru-RU') : null,
        href: '/admin-v4/sync-health',
        tone: sync?.lastSyncAt ? 'default' : 'warning',
      },
      {
        key: 'open_sync_issues',
        label: 'Открытые проблемы',
        value: dash?.imports.openIssues ?? null,
        href: '/admin-v4/sources',
        tone: dash?.imports.openIssues != null && dash.imports.openIssues > 0 ? 'warning' : 'default',
      },
      {
        key: 'mapping_inbox_count',
        label: 'Очередь маппинга',
        value: unknowns,
        href: '/admin-v4/mapping-inbox',
        tone: unknowns != null && unknowns > 0 ? 'warning' : 'default',
      },
      {
        key: 'stale_source_count',
        label: 'Устаревшие источники',
        value: dash?.imports.staleSources ?? null,
        href: '/admin-v4/sources',
        tone: dash?.imports.staleSources != null && dash.imports.staleSources > 0 ? 'warning' : 'default',
      },
    ],
  };

  const externalOrdersFeed: DashboardBlock = {
    id: 'external-orders-feed',
    title: 'Внешние заказы',
    description: 'Read-only зеркало продаж у провайдеров и ручные операционные действия.',
    signals: [
      { key: 'recent_external_orders_count', label: 'Недавние заказы', value: dash?.externalOrders.recent ?? null, href: '/admin-v4/orders' },
      { key: 'confirmed', label: 'Подтверждены', value: dash?.externalOrders.confirmed ?? null, href: '/admin-v4/orders?status=CONFIRMED' },
      { key: 'pending_confirmation', label: 'В ожидании', value: dash?.externalOrders.pending ?? null, href: '/admin-v4/orders?status=OPEN' },
      { key: 'cancelled', label: 'Отменены', value: dash?.externalOrders.cancelled ?? null, href: '/admin-v4/orders?status=CANCELLED' },
    ],
  };

  const blocks: DashboardBlock[] = [catalogReadiness, importHealth, externalOrdersFeed, landingTraffic];
  return { generatedAt, blocks, partial: warnings.length > 0 || !dash, warnings };
}
