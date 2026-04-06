import { Navigate, Route, Routes } from 'react-router-dom';

import { DashboardPage } from '@/pages/dashboard/dashboard-page';
import { EventDetailPage } from '@/pages/events/event-detail-page';
import { EventMasterPage } from '@/pages/events/event-master-page';
import { EventsListPage } from '@/pages/events/events-list-page';
import { ArticleDetailPage } from '@/pages/articles/article-detail-page';
import { CityHubPage } from '@/pages/cities/city-hub-page';
import { CollectionDetailPage } from '@/pages/collections/collection-detail-page';
import { LandingDetailPage } from '@/pages/landings/landing-detail-page';
import { LandingTopicHubPage } from '@/pages/landings/landing-topic-hub-page';
import { NotFoundPage } from '@/pages/not-found/not-found-page';
import { PromoBlockDetailPage } from '@/pages/promo-blocks/promo-block-detail-page';
import { OrderDetailPage } from '@/pages/orders/order-detail-page';
import { OrdersListPage } from '@/pages/orders/orders-list-page';
import { SettingsPage } from '@/pages/settings/settings-page';
import {
  ArticlesPage,
  ChatPage,
  CitiesPage,
  CollectionsPage,
  FinanceDocumentsPage,
  LandingsPage,
  MarketingPromoCodesPage,
  MarketingPromoCollectionsPage,
  MarketingUpsellsPage,
  ModerationPage,
  PromoBlocksPage,
  ReconciliationPage,
  ReviewsPage,
  SeoAuditPage,
  SupportPage,
  TagsPage,
  UsersPage,
} from '@/pages/sections/section-screens';
import { SupplierDetailPage } from '@/pages/suppliers/supplier-detail-page';
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
        <Route path="events/new" element={<EventMasterPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="events" element={<EventsListPage />} />
        <Route path="venues" element={<VenuesListPage />} />
        <Route path="venues/:id" element={<VenueDetailPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="orders" element={<OrdersListPage />} />
        <Route path="suppliers/:id" element={<SupplierDetailPage />} />
        <Route path="suppliers" element={<SuppliersListPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="moderation" element={<ModerationPage />} />
        <Route path="cities/:id" element={<CityHubPage />} />
        <Route path="cities" element={<CitiesPage />} />
        <Route path="tags" element={<TagsPage />} />
        <Route path="articles/:id" element={<ArticleDetailPage />} />
        <Route path="articles" element={<ArticlesPage />} />
        <Route path="collections/:id" element={<CollectionDetailPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="landings/topics/:slug" element={<LandingTopicHubPage />} />
        <Route path="landings/:id" element={<LandingDetailPage />} />
        <Route path="landings" element={<LandingsPage />} />
        <Route path="marketing/promo-codes" element={<MarketingPromoCodesPage />} />
        <Route path="marketing/promo-collections" element={<MarketingPromoCollectionsPage />} />
        <Route path="marketing/upsells" element={<MarketingUpsellsPage />} />
        <Route path="promo-blocks/:id" element={<PromoBlockDetailPage />} />
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
