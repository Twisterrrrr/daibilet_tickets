/**
 * Скелетон для каталога /events.
 * Отображается при навигации на /events до загрузки client page.
 */
export default function EventsCatalogLoading() {
  return (
    <div className="container-page py-6 sm:py-10">
      <div className="mb-5 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-8 w-48 rounded bg-slate-200 sm:h-9" />
          <div className="mt-2 h-4 w-64 rounded bg-slate-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-slate-200" />
          <div className="h-9 w-20 rounded-lg bg-slate-200" />
        </div>
      </div>

      {/* Category tabs skeleton */}
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-24 flex-shrink-0 rounded-md bg-slate-200" />
        ))}
      </div>

      {/* Date ribbon skeleton */}
      <div className="mb-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-10 w-14 flex-shrink-0 rounded-lg bg-slate-200" />
        ))}
      </div>

      {/* Filters row skeleton */}
      <div className="mb-5 flex flex-wrap gap-2">
        <div className="h-9 w-28 rounded-lg bg-slate-200" />
        <div className="h-9 w-24 rounded-lg bg-slate-200" />
        <div className="h-9 w-20 rounded-lg bg-slate-200" />
        <div className="h-9 w-32 rounded-lg bg-slate-200" />
      </div>

      {/* Cards grid skeleton */}
      <div className="grid gap-3 grid-cols-1 min-[361px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-36 sm:h-48 bg-slate-200 rounded-t-xl" />
            <div className="p-3 sm:p-4 space-y-2.5">
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-200" />
              <div className="h-5 w-1/3 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
