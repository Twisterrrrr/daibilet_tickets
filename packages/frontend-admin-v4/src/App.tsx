import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminShell } from '@/components/admin/AdminShell';
import { RequireAuth } from '@/shared/auth/guard/RequireAuth';
import { ADMIN_V4_BASE } from '@/lib/auth-paths';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ImportSourcesPage } from '@/pages/imports/ImportSourcesPage';
import { ExternalOrdersPage } from '@/pages/imported-sales/ExternalOrdersPage';
import { ExternalOrderDetailPage } from '@/pages/imported-sales/ExternalOrderDetailPage';
import { EventDetailPage } from '@/pages/workflow/EventDetailPage';
import { EventsPage } from '@/pages/workflow/EventsPage';
import { CitiesPage } from '@/pages/hubs/CitiesPage';
import { CityDetailPage } from '@/pages/hubs/CityDetailPage';
import { CollectionsPage } from '@/pages/hubs/CollectionsPage';
import { CollectionDetailPage } from '@/pages/hubs/CollectionDetailPage';
import { LandingDetailPage } from '@/modules/landings/pages/LandingDetailPage';
import { LandingsPage } from '@/pages/hubs/LandingsPage';
import { VenueDetailPage } from '@/pages/hubs/VenueDetailPage';
import { VenuesPage } from '@/pages/hubs/VenuesPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { FrozenPage } from '@/pages/placeholder/FrozenPage';
import { SeoAuditPage } from '@/pages/seo/SeoAuditPage';
import { PromoPlacementBlockDetailPage } from '@/pages/promo/PromoPlacementBlockDetailPage';
import { PromoPlacementBlocksPage } from '@/pages/promo/PromoPlacementBlocksPage';
import { AuditLogPage } from '@/pages/system/AuditLogPage';
import { MappingInboxPage } from '@/pages/system/MappingInboxPage';
import { RefundRequestsPage } from '@/pages/system/RefundRequestsPage';
import { SettingsPage } from '@/pages/system/SettingsPage';
import { SyncHealthPage } from '@/pages/system/SyncHealthPage';
import { TaxonomyPage } from '@/pages/system/TaxonomyPage';

export function App() {
  return (
    <Routes>
      <Route path={`${ADMIN_V4_BASE}/login`} element={<LoginPage />} />

      <Route path={ADMIN_V4_BASE} element={<RequireAuth />}>
        <Route element={<AdminShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:id" element={<EventDetailPage />} />
          <Route path="sources" element={<ImportSourcesPage />} />
          <Route path="orders" element={<ExternalOrdersPage />} />
          <Route path="orders/:id" element={<ExternalOrderDetailPage />} />
          <Route path="venues" element={<VenuesPage />} />
          <Route path="venues/:id" element={<VenueDetailPage />} />
          <Route path="cities" element={<CitiesPage />} />
          <Route path="cities/:id" element={<CityDetailPage />} />
          <Route path="landings" element={<LandingsPage />} />
          <Route path="landings/:id" element={<LandingDetailPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="collections/:id" element={<CollectionDetailPage />} />
          <Route path="seo" element={<SeoAuditPage />} />
          <Route path="seo-audit" element={<SeoAuditPage />} />
          {/* Hidden diagnostics (not in MVP sidebar): same page as legacy `seo` / `seo-audit` */}
          <Route path="seo-health" element={<SeoAuditPage />} />
          <Route path="promo-placement-blocks" element={<PromoPlacementBlocksPage />} />
          <Route path="promo-placement-blocks/:id" element={<PromoPlacementBlockDetailPage />} />
          <Route path="linking" element={<FrozenPage title="Перелинковка" reason="Backend-движок перелинковки (linking engine) не подключаем в рамках MVP Admin V4, чтобы не симулировать прод-инструменты." />} />
          <Route path="redirects" element={<FrozenPage title="Редиректы" reason="Редиректы заморожены: не показываем фейковые правила и не создаём новый redirect engine без готового backend-источника." />} />
          <Route path="mapping-inbox" element={<MappingInboxPage />} />
          <Route path="sync-health" element={<SyncHealthPage />} />
          <Route path="taxonomy" element={<TaxonomyPage />} />
          <Route path="refund-requests" element={<RefundRequestsPage />} />
          <Route path="audit-log" element={<AuditLogPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to={`${ADMIN_V4_BASE}/dashboard`} replace />} />
      <Route path="*" element={<Navigate to={`${ADMIN_V4_BASE}/dashboard`} replace />} />
    </Routes>
  );
}

