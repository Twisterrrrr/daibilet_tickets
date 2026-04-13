export function StubPage({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Здесь будет единый list/detail pattern на V3 UI-kit.
      </div>
    </div>
  );
}

