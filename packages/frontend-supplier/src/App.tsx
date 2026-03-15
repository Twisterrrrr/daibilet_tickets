import { Navigate, Route, Routes } from 'react-router-dom';

import { isAuthenticated } from './lib/api';
import Dashboard from './pages/Dashboard';
import EventEdit from './pages/events/EventEdit';
import EventsList from './pages/events/EventsList';
import Layout from './pages/Layout';
import OrdersPage from './pages/Orders';
import Login from './pages/Login';
import Register from './pages/Register';
import Reports from './pages/Reports';
import Reviews from './pages/Reviews';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import BalancePage from './pages/Balance';
import Team from './pages/Team';
import Integrations from './pages/Integrations';
import InviteAccept from './pages/InviteAccept';

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
        <Route path="events" element={<EventsList />} />
        <Route path="events/new" element={<EventEdit />} />
        <Route path="events/:id" element={<EventEdit />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="reviews/:id" element={<Reviews />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="reports" element={<Reports />} />
        <Route path="balance" element={<BalancePage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="team" element={<Team />} />
        <Route path="integrations" element={<Integrations />} />
      </Route>
    </Routes>
  );
}
