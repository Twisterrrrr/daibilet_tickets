import { AdminShell } from '@/app/layout/AdminShell';
import { QueryProvider } from '@/app/providers/query-provider';
import { FeatureRoute } from '@/lib/guards/FeatureRoute';
import { FeatureDisabledPage } from '@/pages/feature-disabled/FeatureDisabledPage';
import { StubPage } from '@/pages/_stub/StubPage';
import * as React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const EventsListPage = React.lazy(() => import('@/pages/events/EventsListPage').then((m) => ({ default: m.EventsListPage })));
const EventDetailPage = React.lazy(() => import('@/pages/events/EventDetailPage').then((m) => ({ default: m.EventDetailPage })));

const VenuesListPage = React.lazy(() => import('@/modules/venues/pages/VenuesListPage').then((m) => ({ default: m.VenuesListPage })));
const VenueCandidatesPage = React.lazy(() =>
  import('@/modules/venues/pages/VenueCandidatesPage').then((m) => ({ default: m.VenueCandidatesPage })),
);
const VenueAutomationPage = React.lazy(() =>
  import('@/modules/venues/pages/VenueAutomationPage').then((m) => ({ default: m.VenueAutomationPage })),
);
const VenueModerationAnalyticsPage = React.lazy(() =>
  import('@/modules/venues/pages/VenueModerationAnalyticsPage').then((m) => ({ default: m.VenueModerationAnalyticsPage })),
);
const VenueDetailPage = React.lazy(() => import('@/modules/venues/pages/VenueDetailPage').then((m) => ({ default: m.VenueDetailPage })));

const CitiesListPage = React.lazy(() => import('@/modules/cities/pages/CitiesListPage').then((m) => ({ default: m.CitiesListPage })));
const CityDetailPage = React.lazy(() => import('@/modules/cities/pages/CityDetailPage').then((m) => ({ default: m.CityDetailPage })));

const SuppliersListPage = React.lazy(() => import('@/modules/suppliers/pages/SuppliersListPage').then((m) => ({ default: m.SuppliersListPage })));
const SupplierDetailPage = React.lazy(() => import('@/modules/suppliers/pages/SupplierDetailPage').then((m) => ({ default: m.SupplierDetailPage })));

const CollectionsListPage = React.lazy(() => import('@/modules/collections/pages/CollectionsListPage').then((m) => ({ default: m.CollectionsListPage })));
const CollectionDetailPage = React.lazy(() => import('@/modules/collections/pages/CollectionDetailPage').then((m) => ({ default: m.CollectionDetailPage })));

const ArticlesListPage = React.lazy(() => import('@/modules/articles/pages/ArticlesListPage').then((m) => ({ default: m.ArticlesListPage })));
const ArticleEditPage = React.lazy(() => import('@/modules/articles/pages/ArticleEditPage').then((m) => ({ default: m.ArticleEditPage })));

const LandingsListPage = React.lazy(() => import('@/modules/landings/pages/LandingsListPage').then((m) => ({ default: m.LandingsListPage })));
const LandingDetailPage = React.lazy(() => import('@/modules/landings/pages/LandingDetailPage').then((m) => ({ default: m.LandingDetailPage })));

const TagsListPage = React.lazy(() => import('@/modules/tags/pages/TagsListPage').then((m) => ({ default: m.TagsListPage })));
const TagDetailPage = React.lazy(() => import('@/modules/tags/pages/TagDetailPage').then((m) => ({ default: m.TagDetailPage })));
const SeoAuditPage = React.lazy(() => import('@/modules/seo-audit/pages/SeoAuditPage').then((m) => ({ default: m.SeoAuditPage })));
const SubcategoriesListPage = React.lazy(() =>
  import('@/modules/subcategories/pages/SubcategoriesListPage').then((m) => ({ default: m.SubcategoriesListPage })),
);
const SubcategoryDetailPage = React.lazy(() =>
  import('@/modules/subcategories/pages/SubcategoryDetailPage').then((m) => ({ default: m.SubcategoryDetailPage })),
);
const SubcategoryCreatePage = React.lazy(() =>
  import('@/modules/subcategories/pages/SubcategoryCreatePage').then((m) => ({ default: m.SubcategoryCreatePage })),
);

const ChatListPage = React.lazy(() => import('@/modules/chat/pages/ChatListPage').then((m) => ({ default: m.ChatListPage })));
const ChatDetailPage = React.lazy(() => import('@/modules/chat/pages/ChatDetailPage').then((m) => ({ default: m.ChatDetailPage })));

const ReviewsListPage = React.lazy(() => import('@/modules/reviews/pages/ReviewsListPage').then((m) => ({ default: m.ReviewsListPage })));
const PromoBlocksListPage = React.lazy(() =>
  import('@/modules/promo-blocks/pages/PromoBlocksListPage').then((m) => ({ default: m.PromoBlocksListPage })),
);
const PromoPlacementBlocksListPage = React.lazy(() =>
  import('@/modules/promo-placement-blocks/pages/PromoPlacementBlocksListPage').then((m) => ({ default: m.PromoPlacementBlocksListPage })),
);
const TicketsPage = React.lazy(() => import('@/modules/tickets/pages/TicketsPage').then((m) => ({ default: m.TicketsPage })));
const SupportTicketDetailPage = React.lazy(() =>
  import('@/modules/tickets/pages/SupportTicketDetailPage').then((m) => ({ default: m.SupportTicketDetailPage })),
);
const SiteUsersListPage = React.lazy(() =>
  import('@/modules/customers/pages/SiteUsersListPage').then((m) => ({ default: m.SiteUsersListPage })),
);
const CheckoutOrdersListPage = React.lazy(() =>
  import('@/modules/orders/pages/CheckoutOrdersListPage').then((m) => ({ default: m.CheckoutOrdersListPage })),
);
const CheckoutOrderDetailPage = React.lazy(() =>
  import('@/modules/orders/pages/CheckoutOrderDetailPage').then((m) => ({ default: m.CheckoutOrderDetailPage })),
);
const RefundsListPage = React.lazy(() => import('@/modules/refunds/pages/RefundsListPage').then((m) => ({ default: m.RefundsListPage })));
const StaffUsersListPage = React.lazy(() =>
  import('@/modules/staff/pages/StaffUsersListPage').then((m) => ({ default: m.StaffUsersListPage })),
);
const LogsPage = React.lazy(() => import('@/modules/logs/pages/LogsPage').then((m) => ({ default: m.LogsPage })));
const SettingsPage = React.lazy(() => import('@/modules/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const GeoDictionariesPage = React.lazy(() =>
  import('@/modules/geo/pages/GeoDictionariesPage').then((m) => ({ default: m.GeoDictionariesPage })),
);
const RoutesListPage = React.lazy(() =>
  import('@/modules/routes/pages/RoutesListPage').then((m) => ({ default: m.RoutesListPage })),
);
const RoutePointsPage = React.lazy(() =>
  import('@/modules/routes/pages/RoutePointsPage').then((m) => ({ default: m.RoutePointsPage })),
);
const ModerationPage = React.lazy(() =>
  import('@/modules/moderation/pages/ModerationPage').then((m) => ({ default: m.ModerationPage })),
);

export default function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Загрузка…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/admin-v3/dashboard" replace />} />

            <Route path="/admin-v3" element={<AdminShell />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              <Route path="events" element={<EventsListPage />} />
              <Route path="events/:id" element={<EventDetailPage />} />

              <Route path="venues" element={<VenuesListPage />} />
              <Route path="venues/candidates" element={<VenueCandidatesPage />} />
              <Route path="venues/automation" element={<VenueAutomationPage />} />
              <Route path="venues/analytics" element={<VenueModerationAnalyticsPage />} />
              <Route path="venues/:id" element={<VenueDetailPage />} />

              <Route path="cities" element={<CitiesListPage />} />
              <Route path="cities/:id" element={<CityDetailPage />} />

              <Route path="routes" element={<RoutesListPage />} />
              <Route path="routes/:routeId/points" element={<RoutePointsPage />} />

              <Route path="suppliers" element={<SuppliersListPage />} />
              <Route path="suppliers/:id" element={<SupplierDetailPage />} />

              <Route path="collections" element={<CollectionsListPage />} />
              <Route path="collections/:id" element={<CollectionDetailPage />} />

              <Route path="articles" element={<ArticlesListPage />} />
              <Route path="articles/:id" element={<ArticleEditPage />} />

              <Route path="landings" element={<LandingsListPage />} />
              <Route path="landings/:id" element={<LandingDetailPage />} />

              <Route path="tags" element={<TagsListPage />} />
              <Route path="tags/:id" element={<TagDetailPage />} />
              <Route path="seo-audit" element={<SeoAuditPage />} />
              <Route path="subcategories" element={<SubcategoriesListPage />} />
              <Route path="subcategories/new" element={<SubcategoryCreatePage />} />
              <Route path="subcategories/:id" element={<SubcategoryDetailPage />} />
            <Route path="promo-blocks" element={<PromoBlocksListPage />} />
              <Route path="promo-placement-blocks" element={<PromoPlacementBlocksListPage />} />

              <Route path="customers" element={<SiteUsersListPage />} />
              <Route path="orders" element={<CheckoutOrdersListPage />} />
              <Route path="orders/:id" element={<CheckoutOrderDetailPage />} />
              <Route path="refunds" element={<RefundsListPage />} />

              <Route path="chat" element={<ChatListPage />} />
              <Route path="chat/:id" element={<ChatDetailPage />} />

              <Route path="reviews" element={<ReviewsListPage />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="tickets/:id" element={<SupportTicketDetailPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="geo" element={<GeoDictionariesPage />} />
              <Route path="logs" element={<LogsPage />} />
              <Route
                path="moderation"
                element={
                  <FeatureRoute feature="MODERATION">
                    <ModerationPage />
                  </FeatureRoute>
                }
              />

              <Route
                path="sales"
                element={
                  <FeatureRoute feature="SALES">
                    <StubPage title="Продажи" />
                  </FeatureRoute>
                }
              />
              <Route
                path="finance"
                element={
                  <FeatureRoute feature="FINANCE">
                    <StubPage title="Финансы" />
                  </FeatureRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <FeatureRoute feature="REPORTS">
                    <StubPage title="Отчеты" />
                  </FeatureRoute>
                }
              />
              <Route
                path="staff-users"
                element={
                  <FeatureRoute feature="USERS">
                    <StaffUsersListPage />
                  </FeatureRoute>
                }
              />

              <Route path="feature-disabled" element={<FeatureDisabledPage />} />

              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </QueryProvider>
  );
}

