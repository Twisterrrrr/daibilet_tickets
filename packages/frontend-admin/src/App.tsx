import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/layout/Layout';
import { flags } from './config/flags';
import { isAuthenticated } from './lib/auth';
import { ArticleEditPage } from './pages/articles/ArticleEdit';
import { ArticlesListPage } from './pages/articles/ArticlesList';
import { AuditLogPage } from './pages/audit/AuditLog';
import { CheckoutSessionsListPage } from './pages/checkout/CheckoutSessionsList';
import { CitiesListPage } from './pages/cities/CitiesList';
import { CityEditPage } from './pages/cities/CityEdit';
import { CollectionEditPage } from './pages/collections/CollectionEdit';
import { CollectionsListPage } from './pages/collections/CollectionsList';
import { ComboEditPage } from './pages/combos/ComboEdit';
import { CombosListPage } from './pages/combos/CombosList';
import { DashboardPage } from './pages/Dashboard';
import { EventCreatePage } from './pages/events/EventCreate';
import { EventEditPage } from './pages/events/EventEdit';
import { EventsListPage } from './pages/events/EventsList';
import { EventsMergePage } from './pages/events/EventsMerge';
import { FailedJobsPage } from './pages/jobs/FailedJobsPage';
import { LandingEditPage } from './pages/landings/LandingEdit';
import { LandingsListPage } from './pages/landings/LandingsList';
import { LoginPage } from './pages/Login';
import { ModerationQueuePage } from './pages/moderation/ModerationQueue';
import { OrderDetailPage } from './pages/orders/OrderDetail';
import { OrdersListPage } from './pages/orders/OrdersList';
import ReconciliationPage from './pages/reconciliation/ReconciliationPage';
import { ExternalReviewsListPage } from './pages/reviews/ExternalReviewsList';
import { ReviewsListPage } from './pages/reviews/ReviewsList';
import { SeoAuditPage } from './pages/seo/SeoAuditPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { WidgetEditPage } from './pages/widgets/WidgetEdit';
import { WidgetsListPage } from './pages/widgets/WidgetsList';
import { SupplierDetailPage } from './pages/suppliers/SupplierDetail';
import { SuppliersListPage } from './pages/suppliers/SuppliersList';
import { SupportDetailPage } from './pages/support/SupportDetail';
import { VenuesListPage } from './pages/venues/VenuesList';
import { VenueEditPage } from './pages/venues/VenueEdit';
import { TagsListPage } from './pages/tags/TagsList';
import { TagEditPage } from './pages/tags/TagEdit';
import { UpsellsListPage } from './pages/upsells/UpsellsList';
import { UpsellEditPage } from './pages/upsells/UpsellEdit';
import { SupportListPage } from './pages/support/SupportList';
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function DisabledRoute() {
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="events" element={flags.showEvents ? <EventsListPage /> : <DisabledRoute />} />
          <Route path="events/merge" element={flags.showEvents ? <EventsMergePage /> : <DisabledRoute />} />
          <Route path="events/new" element={flags.showEvents ? <EventCreatePage /> : <DisabledRoute />} />
          <Route path="events/:id" element={flags.showEvents ? <EventEditPage /> : <DisabledRoute />} />
          <Route path="cities" element={flags.showContent ? <CitiesListPage /> : <DisabledRoute />} />
          <Route path="cities/:id" element={flags.showContent ? <CityEditPage /> : <DisabledRoute />} />
          <Route path="venues" element={flags.showCatalog ? <VenuesListPage /> : <DisabledRoute />} />
          <Route path="venues/new" element={<VenueEditPage />} />
          <Route path="venues/:id" element={<VenueEditPage />} />
          <Route path="tags" element={flags.showContent ? <TagsListPage /> : <DisabledRoute />} />
          <Route path="tags/new" element={<TagEditPage />} />
          <Route path="tags/:id" element={<TagEditPage />} />
          <Route path="landings" element={flags.showContent ? <LandingsListPage /> : <DisabledRoute />} />
          <Route path="landings/new" element={<LandingEditPage />} />
          <Route path="landings/:id" element={<LandingEditPage />} />
          <Route path="collections" element={flags.showContent ? <CollectionsListPage /> : <DisabledRoute />} />
          <Route path="collections/new" element={<CollectionEditPage />} />
          <Route path="collections/:id" element={<CollectionEditPage />} />
          <Route path="combos" element={flags.showContent ? <CombosListPage /> : <DisabledRoute />} />
          <Route path="combos/new" element={<ComboEditPage />} />
          <Route path="combos/:id" element={<ComboEditPage />} />
          <Route path="articles" element={flags.showContent ? <ArticlesListPage /> : <DisabledRoute />} />
          <Route path="articles/new" element={<ArticleEditPage />} />
          <Route path="articles/:id" element={<ArticleEditPage />} />
          <Route path="reviews" element={<ReviewsListPage />} />
          <Route path="external-reviews" element={<ExternalReviewsListPage />} />
          <Route path="orders" element={flags.showOrders ? <OrdersListPage /> : <DisabledRoute />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="checkout" element={<CheckoutSessionsListPage />} />
          <Route path="upsells" element={<UpsellsListPage />} />
          <Route path="upsells/new" element={<UpsellEditPage />} />
          <Route path="upsells/:id" element={<UpsellEditPage />} />
          <Route path="suppliers" element={<SuppliersListPage />} />
          <Route path="suppliers/:id" element={<SupplierDetailPage />} />
          <Route path="moderation" element={<ModerationQueuePage />} />
          <Route path="support" element={<SupportListPage />} />
          <Route path="support/:id" element={<SupportDetailPage />} />
          <Route path="jobs/failed" element={flags.showOps ? <FailedJobsPage /> : <DisabledRoute />} />
          <Route path="reconciliation" element={flags.showOps ? <ReconciliationPage /> : <DisabledRoute />} />
          <Route path="audit" element={flags.showOps ? <AuditLogPage /> : <DisabledRoute />} />
          <Route path="seo-audit" element={flags.showContent ? <SeoAuditPage /> : <DisabledRoute />} />
          <Route path="widgets" element={<WidgetsListPage />} />
          <Route path="widgets/new" element={<WidgetEditPage />} />
          <Route path="widgets/:id" element={<WidgetEditPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
