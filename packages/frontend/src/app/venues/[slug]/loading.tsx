export default function VenueDetailLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <section className="relative bg-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="flex gap-2">
                <div className="h-6 w-20 rounded-full bg-slate-300" />
                <div className="h-6 w-24 rounded-full bg-slate-300" />
              </div>
              <div className="h-9 w-3/4 bg-slate-300 rounded" />
              <div className="h-5 w-1/2 bg-slate-300 rounded" />
              <div className="h-4 w-full max-w-md bg-slate-300 rounded" />
            </div>
            <div className="hidden md:flex flex-col items-end gap-2">
              <div className="h-8 w-20 bg-slate-300 rounded" />
              <div className="h-12 w-32 bg-slate-400 rounded-xl" />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Tickets block skeleton */}
            <div className="h-48 rounded-xl bg-slate-100" />
            {/* Info skeleton */}
            <div className="h-64 rounded-xl bg-slate-100" />
            {/* Description skeleton */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-4 w-5/6 bg-slate-100 rounded" />
              <div className="h-4 w-4/5 bg-slate-100 rounded" />
            </div>
          </div>
          {/* Sidebar skeleton */}
          <div className="hidden lg:block space-y-5">
            <div className="h-40 rounded-xl bg-slate-100" />
            <div className="h-32 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
