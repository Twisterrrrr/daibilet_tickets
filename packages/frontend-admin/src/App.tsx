import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { EventsListPage } from './pages/events/EventsList';
import { EventEditPage } from './pages/events/EventEdit';
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
import { AuditLogPage } from './pages/audit/AuditLog';
import { SettingsPage } from './pages/settings/SettingsPage';
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
          <Route path="events/:id" element={<EventEditPage />} />
          <Route path="cities" element={<CitiesListPage />} />
          <Route path="cities/:id" element={<CityEditPage />} />
          <Route path="tags" element={<TagsListPage />} />
          <Route path="tags/new" element={<TagEditPage />} />
          <Route path="tags/:id" element={<TagEditPage />} />
          <Route path="landings" element={<LandingsListPage />} />
          <Route path="landings/new" element={<LandingEditPage />} />
          <Route path="landings/:id" element={<LandingEditPage />} />
          <Route path="combos" element={<CombosListPage />} />
          <Route path="combos/new" element={<ComboEditPage />} />
          <Route path="combos/:id" element={<ComboEditPage />} />
          <Route path="articles" element={<ArticlesListPage />} />
          <Route path="articles/new" element={<ArticleEditPage />} />
          <Route path="articles/:id" element={<ArticleEditPage />} />
          <Route path="orders" element={<OrdersListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="upsells" element={<UpsellsListPage />} />
          <Route path="upsells/new" element={<UpsellEditPage />} />
          <Route path="upsells/:id" element={<UpsellEditPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
