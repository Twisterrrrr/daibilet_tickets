import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { isAuthenticated } from './lib/api';
import Availability from './pages/Availability';
import EventsList from './pages/events/EventsList';
import Layout from './pages/Layout';
import OrdersPage from './pages/Orders';
import Login from './pages/Login';
import Register from './pages/Register';
import Reviews from './pages/Reviews';
import Notifications from './pages/Notifications';
import Requisites from './pages/Requisites';
import Team from './pages/Team';
import InviteAccept from './pages/InviteAccept';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const EventEdit = lazy(() => import('./pages/events/EventEdit'));
const Reports = lazy(() => import('./pages/Reports'));
const BalancePage = lazy(() => import('./pages/Balance'));
const FinanceDocumentsPage = lazy(() => import('./pages/FinanceDocuments'));
const Settings = lazy(() => import('./pages/Settings'));
const Integrations = lazy(() => import('./pages/Integrations'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/invite/:token" element={<InviteAccept />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="availability" element={<Availability />} />
        <Route path="events" element={<EventsList />} />
        <Route path="events/new" element={<EventEdit />} />
        <Route path="events/:id" element={<EventEdit />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="reviews/:id" element={<Reviews />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="reports" element={<Reports />} />
        <Route path="balance" element={<BalancePage />} />
        <Route path="requisites" element={<Requisites />} />
        <Route path="finance-documents" element={<FinanceDocumentsPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="team" element={<Team />} />
        <Route path="integrations" element={<Integrations />} />
      </Route>
    </Routes>
  );
}
