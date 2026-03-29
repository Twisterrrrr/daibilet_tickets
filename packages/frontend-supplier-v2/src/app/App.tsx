import { Navigate, Route, Routes } from 'react-router-dom';

import { SupplierPageShell } from '@/shared/layout/supplier-page-shell';
import { isAuthenticated } from '@/shared/lib/api';
import { AvailabilityPage } from '@/pages/availability-page';
import { BalancePage } from '@/pages/balance-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { EventWorkspaceStubPage } from '@/pages/event-workspace-stub-page';
import { EventsListPage } from '@/pages/events-list-page';
import { FinanceDocumentsPage } from '@/pages/finance-documents-page';
import { IntegrationsPage } from '@/pages/integrations-page';
import { InvitePage } from '@/pages/invite-page';
import { LoginPage } from '@/pages/login-page';
import { NotificationsPage } from '@/pages/notifications-page';
import { OrdersPage } from '@/pages/orders-page';
import { RegisterPage } from '@/pages/register-page';
import { ReportsPage } from '@/pages/reports-page';
import { ReviewDetailPage } from '@/pages/review-detail-page';
import { ReviewsListPage } from '@/pages/reviews-list-page';
import { RequisitesPage } from '@/pages/requisites-page';
import { SettingsPage } from '@/pages/settings-page';
import { TeamPage } from '@/pages/team-page';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SupplierPageShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="availability" element={<AvailabilityPage />} />
        <Route path="events" element={<EventsListPage />} />
        <Route path="events/new" element={<EventWorkspaceStubPage />} />
        <Route path="events/:id" element={<EventWorkspaceStubPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="reviews" element={<ReviewsListPage />} />
        <Route path="reviews/:id" element={<ReviewDetailPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="balance" element={<BalancePage />} />
        <Route path="requisites" element={<RequisitesPage />} />
        <Route path="finance-documents" element={<FinanceDocumentsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
