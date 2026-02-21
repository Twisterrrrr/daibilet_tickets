export default function EventPageLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <div className="relative">
        <div className="h-72 overflow-hidden bg-slate-800 sm:h-80 lg:h-[420px]">
          <div className="h-full w-full bg-slate-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
        </div>
        <div className="container-page absolute inset-x-0 bottom-0 pb-6 sm:pb-8">
          <div className="mb-3 h-3 w-40 rounded bg-white/20" />
          <div className="max-w-3xl space-y-2">
            <div className="h-6 w-32 rounded-full bg-white/20" />
            <div className="h-8 w-3/4 rounded bg-white/30" />
            <div className="mt-3 flex flex-wrap gap-3">
              <div className="h-4 w-32 rounded bg-white/20" />
              <div className="h-4 w-28 rounded bg-white/20" />
              <div className="h-4 w-24 rounded bg-white/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="container-page py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick info cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                  <div className="h-5 w-5 rounded bg-slate-200" />
                  <div className="h-3 w-12 rounded bg-slate-200" />
                  <div className="h-4 w-20 rounded bg-slate-200" />
                </div>
              ))}
            </div>

            {/* Description block */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-slate-200" />
                <div className="h-3 w-11/12 rounded bg-slate-200" />
                <div className="h-3 w-10/12 rounded bg-slate-200" />
              </div>
            </div>

            {/* Sessions block */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
                    <div className="h-3 w-24 rounded bg-slate-200" />
                    <div className="h-3 w-20 rounded bg-slate-200" />
                    <div className="h-3 w-16 rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column (booking card) */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="h-6 w-32 rounded bg-slate-200" />
              <div className="h-10 w-full rounded-lg bg-slate-300" />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="h-3 w-28 rounded bg-slate-200" />
              <div className="h-3 w-36 rounded bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

