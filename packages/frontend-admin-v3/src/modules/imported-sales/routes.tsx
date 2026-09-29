import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

const ImportedSalesDashboardPage = React.lazy(() =>
  import('./pages/ImportedSalesDashboardPage').then((m) => ({ default: m.ImportedSalesDashboardPage })),
);
const ImportedSalesEventsPage = React.lazy(() =>
  import('./pages/ImportedSalesEventsPage').then((m) => ({ default: m.ImportedSalesEventsPage })),
);

export function ImportedSalesRoutes() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Загрузка…</div>}>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ImportedSalesDashboardPage />} />
        <Route path="events" element={<ImportedSalesEventsPage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </React.Suspense>
  );
}

