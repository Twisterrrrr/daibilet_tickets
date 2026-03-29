import { Navigate, Route, Routes } from 'react-router-dom';

import { DashboardPage } from '@/pages/dashboard/dashboard-page';
import { EventDetailPage } from '@/pages/events/event-detail-page';
import { EventsListPage } from '@/pages/events/events-list-page';
import { NotFoundPage } from '@/pages/not-found/not-found-page';
import { OrdersListPage } from '@/pages/orders/orders-list-page';
import { SettingsPage } from '@/pages/settings/settings-page';
import {
  ArticlesPage,
  ChatPage,
  CitiesPage,
  CollectionsPage,
  FinanceDocumentsPage,
  LandingsPage,
  ModerationPage,
  PromoBlocksPage,
  ReconciliationPage,
  ReviewsPage,
  SeoAuditPage,
  SupportPage,
  TagsPage,
  UsersPage,
} from '@/pages/sections/section-screens';
import { SuppliersListPage } from '@/pages/suppliers/suppliers-list-page';
import { VenueDetailPage } from '@/pages/venues/venue-detail-page';
import { VenuesListPage } from '@/pages/venues/venues-list-page';
import { AdminPageShell } from '@/shared/layout/admin-page-shell';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<AdminPageShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="events" element={<EventsListPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="venues" element={<VenuesListPage />} />
        <Route path="venues/:id" element={<VenueDetailPage />} />
        <Route path="orders" element={<OrdersListPage />} />
        <Route path="suppliers" element={<SuppliersListPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="moderation" element={<ModerationPage />} />
        <Route path="cities" element={<CitiesPage />} />
        <Route path="tags" element={<TagsPage />} />
        <Route path="articles" element={<ArticlesPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="landings" element={<LandingsPage />} />
        <Route path="promo-blocks" element={<PromoBlocksPage />} />
        <Route path="finance-documents" element={<FinanceDocumentsPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="reconciliation" element={<ReconciliationPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="catalog-consistency" element={<Navigate to="/seo-audit?tab=catalog" replace />} />
        <Route path="seo-audit" element={<SeoAuditPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
