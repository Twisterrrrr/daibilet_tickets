import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { EventsListPage } from './pages/events/EventsList';
import { EventsMergePage } from './pages/events/EventsMerge';
import { EventEditPage } from './pages/events/EventEdit';
import { EventCreatePage } from './pages/events/EventCreate';
import { CitiesListPage } from './pages/cities/CitiesList';
import { CityEditPage } from './pages/cities/CityEdit';
import { TagsListPage } from './pages/tags/TagsList';
import { TagEditPage } from './pages/tags/TagEdit';
import { LandingsListPage } from './pages/landings/LandingsList';
import { LandingEditPage } from './pages/landings/LandingEdit';
import { CombosListPage } from './pages/combos/CombosList';
import { ComboEditPage } from './pages/combos/ComboEdit';
import { ArticlesListPage } from './pages/articles/ArticlesList';
import { ArticleEditPage } from './pages/articles/ArticleEdit';
import { OrdersListPage } from './pages/orders/OrdersList';
import { OrderDetailPage } from './pages/orders/OrderDetail';
import { UpsellsListPage } from './pages/upsells/UpsellsList';
import { UpsellEditPage } from './pages/upsells/UpsellEdit';
import { ReviewsListPage } from './pages/reviews/ReviewsList';
import { ExternalReviewsListPage } from './pages/reviews/ExternalReviewsList';
import { CheckoutSessionsListPage } from './pages/checkout/CheckoutSessionsList';
import { AuditLogPage } from './pages/audit/AuditLog';
import { SettingsPage } from './pages/settings/SettingsPage';
import { SuppliersListPage } from './pages/suppliers/SuppliersList';
import { SupplierDetailPage } from './pages/suppliers/SupplierDetail';
import { ModerationQueuePage } from './pages/moderation/ModerationQueue';
import { VenuesListPage } from './pages/venues/VenuesList';
import { VenueEditPage } from './pages/venues/VenueEdit';
import { CollectionsListPage } from './pages/collections/CollectionsList';
import { CollectionEditPage } from './pages/collections/CollectionEdit';
import { SupportListPage } from './pages/support/SupportList';
import { SupportDetailPage } from './pages/support/SupportDetail';
import ReconciliationPage from './pages/reconciliation/ReconciliationPage';
import { FailedJobsPage } from './pages/jobs/FailedJobsPage';
import { isAuthenticated } from './lib/auth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
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
          <Route path="events" element={<EventsListPage />} />
          <Route path="events/merge" element={<EventsMergePage />} />
          <Route path="events/new" element={<EventCreatePage />} />
          <Route path="events/:id" element={<EventEditPage />} />
          <Route path="cities" element={<CitiesListPage />} />
          <Route path="cities/:id" element={<CityEditPage />} />
          <Route path="venues" element={<VenuesListPage />} />
          <Route path="venues/new" element={<VenueEditPage />} />
          <Route path="venues/:id" element={<VenueEditPage />} />
          <Route path="tags" element={<TagsListPage />} />
          <Route path="tags/new" element={<TagEditPage />} />
          <Route path="tags/:id" element={<TagEditPage />} />
          <Route path="landings" element={<LandingsListPage />} />
          <Route path="landings/new" element={<LandingEditPage />} />
          <Route path="landings/:id" element={<LandingEditPage />} />
          <Route path="collections" element={<CollectionsListPage />} />
          <Route path="collections/new" element={<CollectionEditPage />} />
          <Route path="collections/:id" element={<CollectionEditPage />} />
          <Route path="combos" element={<CombosListPage />} />
          <Route path="combos/new" element={<ComboEditPage />} />
          <Route path="combos/:id" element={<ComboEditPage />} />
          <Route path="articles" element={<ArticlesListPage />} />
          <Route path="articles/new" element={<ArticleEditPage />} />
          <Route path="articles/:id" element={<ArticleEditPage />} />
          <Route path="reviews" element={<ReviewsListPage />} />
          <Route path="external-reviews" element={<ExternalReviewsListPage />} />
          <Route path="orders" element={<OrdersListPage />} />
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
          <Route path="jobs/failed" element={<FailedJobsPage />} />
          <Route path="reconciliation" element={<ReconciliationPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
