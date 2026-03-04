import type { Metadata } from 'next';
import { Suspense } from 'react';

import PlannerClient from './PlannerClient';

export const metadata: Metadata = {
  title: 'Планировщик поездки',
  description: 'Укажите параметры — мы подберём идеальную программу экскурсий и мероприятий.',
};

export default function PlannerPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-10">
          <div className="mb-8 text-center">
            <div className="h-9 w-48 mx-auto rounded bg-slate-200 animate-pulse" />
            <div className="h-4 w-64 mx-auto mt-2 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="mx-auto max-w-lg h-96 rounded-xl bg-slate-50 animate-pulse" />
        </div>
      }
    >
      <PlannerClient />
    </Suspense>
  );
}
