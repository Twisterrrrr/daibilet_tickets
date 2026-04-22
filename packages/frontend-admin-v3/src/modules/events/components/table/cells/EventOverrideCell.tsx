export function EventOverrideCell({ hasOverride }: { hasOverride?: boolean }) {
  if (!hasOverride) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full bg-primary"
      title="Есть override"
      aria-label="Есть перекрытие слоя"
    />
  );
}

